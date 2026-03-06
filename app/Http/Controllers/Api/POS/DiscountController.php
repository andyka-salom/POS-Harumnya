<?php

namespace App\Http\Controllers\Api\POS;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartDiscount;
use App\Models\CartPackaging;
use App\Models\DiscountRewardPool;
use App\Models\DiscountType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * DiscountController
 *
 * Alur diskon di POS:
 *   [1] POST /discounts/check  → Sistem auto-cek semua diskon eligible
 *                                → Pop-up otomatis jika ada yang eligible
 *   [2] POST /discounts/apply  → Kasir/sistem terapkan diskon ke cart
 *   [3] DELETE /discounts/{id} → Lepas diskon dari cart
 *
 * Game reward:
 *   [4] POST /discounts/game/spin   → Trigger spin/game
 *   [5] POST /discounts/game/choose → Pilih reward dari pool
 */
class DiscountController extends Controller
{
    /**
     * POST /pos/discounts/check
     *
     * Cek semua diskon yang eligible untuk cart saat ini.
     * Dipanggil otomatis setelah kasir menambahkan item ke cart
     * atau saat total cart berubah (tambah/hapus packaging).
     *
     * Response akan memicu pop-up di mobile jika ada diskon eligible.
     *
     * Body: { "cart_id": "uuid" }
     */
    public function check(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cart_id' => 'required|uuid|exists:carts,id',
        ]);

        $store = $request->attributes->get('active_store');
        $cart  = Cart::with([
            'cartPackagings',
            'cartDiscounts',
        ])->findOrFail($validated['cart_id']);

        // Pastikan cart milik kasir & store ini
        abort_if($cart->store_id !== $store->id, 403);

        // Ambil semua diskon aktif yang berlaku hari ini di store ini
        $today = now()->toDateString();

        $discounts = DiscountType::query()
            ->with(['discountApplicabilities', 'discountRequirements', 'discountRewards'])
            ->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('start_date')->orWhere('start_date', '<=', $today))
            ->where(fn ($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $today))
            // Hanya diskon yang berlaku di store ini atau semua store
            ->whereHas('discountStores', fn ($q) =>
                $q->where('store_id', $store->id)->orWhereNull('store_id')
            )
            ->orderByDesc('priority')
            ->get();

        // Hitung cart total
        $cartTotal         = $this->getCartTotal($cart);
        $cartQty           = $cart->qty;
        $alreadyApplied    = $cart->cartDiscounts->pluck('discount_type_id')->toArray();

        $eligible  = [];
        $ineligible = [];

        foreach ($discounts as $discount) {
            // Skip jika tidak bisa dikombinasi dan sudah ada diskon lain
            if (! $discount->is_combinable && ! empty($alreadyApplied)) {
                continue;
            }

            // Skip jika diskon ini sudah diterapkan
            if (in_array($discount->id, $alreadyApplied)) {
                continue;
            }

            $checkResult = $this->checkEligibility($discount, $cart, $cartTotal, $cartQty, $store->id);

            if ($checkResult['eligible']) {
                $eligible[] = [
                    'discount_id'    => $discount->id,
                    'code'           => $discount->code,
                    'name'           => $discount->name,
                    'type'           => $discount->type,
                    'value'          => $discount->value,
                    'description'    => $discount->description,
                    'is_game_reward' => $discount->is_game_reward,
                    'estimated_amount' => $checkResult['estimated_amount'],
                    'estimated_formatted' => 'Rp ' . number_format($checkResult['estimated_amount'], 0, ',', '.'),
                    'reward_preview' => $checkResult['reward_preview'],
                    'auto_apply'     => ! $discount->is_game_reward, // game reward butuh interaksi user
                ];
            } else {
                // Sertakan diskon yang hampir eligible (untuk motivasi upsell)
                if ($checkResult['near_eligible']) {
                    $ineligible[] = [
                        'discount_id'   => $discount->id,
                        'name'          => $discount->name,
                        'type'          => $discount->type,
                        'near_miss'     => $checkResult['near_miss_message'],
                    ];
                }
            }
        }

        return response()->json([
            'has_eligible'    => ! empty($eligible),
            'eligible'        => $eligible,
            'near_eligible'   => $ineligible, // "Tambah Rp X lagi untuk dapat diskon!"
            'cart_total'      => $cartTotal,
            'cart_qty'        => $cartQty,
        ]);
    }

    /**
     * POST /pos/discounts/apply
     *
     * Terapkan diskon ke cart.
     * Masukkan ke cart_discounts dengan applied_amount yang sudah dihitung.
     *
     * Body:
     * {
     *   "cart_id"          : "uuid",
     *   "discount_type_id" : "uuid"
     * }
     */
    public function apply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cart_id'          => 'required|uuid|exists:carts,id',
            'discount_type_id' => 'required|uuid|exists:discount_types,id',
        ]);

        $store    = $request->attributes->get('active_store');
        $cart     = Cart::with(['cartDiscounts', 'cartPackagings'])->findOrFail($validated['cart_id']);
        $discount = DiscountType::with(['discountApplicabilities', 'discountRequirements', 'discountRewards'])
            ->findOrFail($validated['discount_type_id']);

        abort_if($cart->store_id !== $store->id, 403);

        // Validasi: game reward harus melalui /game/spin dulu
        if ($discount->is_game_reward) {
            return response()->json([
                'message' => 'Diskon ini adalah game reward. Gunakan endpoint /game/spin.',
            ], 422);
        }

        // Cek eligibility ulang sebelum apply
        $cartTotal = $this->getCartTotal($cart);
        $check     = $this->checkEligibility($discount, $cart, $cartTotal, $cart->qty, $store->id);

        if (! $check['eligible']) {
            return response()->json([
                'message' => 'Diskon tidak eligible: ' . ($check['reason'] ?? 'Syarat belum terpenuhi.'),
            ], 422);
        }

        // Cek is_combinable
        if (! $discount->is_combinable && $cart->cartDiscounts->count() > 0) {
            return response()->json([
                'message' => 'Diskon ini tidak bisa dikombinasikan dengan diskon lain.',
            ], 422);
        }

        // Cek apakah sudah ada
        if ($cart->cartDiscounts->where('discount_type_id', $discount->id)->count() > 0) {
            return response()->json(['message' => 'Diskon ini sudah diterapkan.'], 422);
        }

        $cartDiscount = CartDiscount::create([
            'cart_id'          => $cart->id,
            'discount_type_id' => $discount->id,
            'applied_amount'   => $check['estimated_amount'],
        ]);

        // Hitung ulang total cart
        $newTotal = $this->getCartTotal($cart->fresh()->load('cartDiscounts'));

        return response()->json([
            'message' => 'Diskon berhasil diterapkan.',
            'discount' => [
                'id'             => $cartDiscount->id,
                'discount_name'  => $discount->name,
                'discount_type'  => $discount->type,
                'applied_amount' => $cartDiscount->applied_amount,
                'amount_formatted' => 'Rp ' . number_format($cartDiscount->applied_amount, 0, ',', '.'),
            ],
            'new_total'           => $newTotal,
            'new_total_formatted' => 'Rp ' . number_format($newTotal, 0, ',', '.'),
        ]);
    }

    /**
     * DELETE /pos/discounts/{cartDiscount}
     *
     * Lepas diskon dari cart.
     */
    public function remove(Request $request, CartDiscount $cartDiscount): JsonResponse
    {
        $store = $request->attributes->get('active_store');
        $cart  = Cart::find($cartDiscount->cart_id);

        abort_if(! $cart || $cart->store_id !== $store->id, 403);

        $cartDiscount->delete();

        $newTotal = $this->getCartTotal($cart->fresh()->load('cartDiscounts'));

        return response()->json([
            'message'             => 'Diskon berhasil dihapus dari cart.',
            'new_total'           => $newTotal,
            'new_total_formatted' => 'Rp ' . number_format($newTotal, 0, ',', '.'),
        ]);
    }

    /**
     * POST /pos/discounts/game/spin
     *
     * Trigger spin/game untuk game_reward discount.
     * Sistem akan menentukan menang/kalah berdasarkan probability.
     *
     * Body:
     * {
     *   "cart_id"          : "uuid",
     *   "discount_type_id" : "uuid"
     * }
     */
    public function spin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cart_id'          => 'required|uuid|exists:carts,id',
            'discount_type_id' => 'required|uuid|exists:discount_types,id',
        ]);

        $store    = $request->attributes->get('active_store');
        $cart     = Cart::findOrFail($validated['cart_id']);
        $discount = DiscountType::with('discountRewards.discountRewardPools')
            ->findOrFail($validated['discount_type_id']);

        abort_if($cart->store_id !== $store->id, 403);
        abort_if(! $discount->is_game_reward, 422, 'Diskon ini bukan game reward.');

        // Tentukan menang/kalah berdasarkan probability
        $probability = $discount->game_probability ?? 50;
        $randomNum   = rand(1, 100);
        $won         = $randomNum <= $probability;

        if (! $won) {
            return response()->json([
                'won'        => false,
                'message'    => 'Belum beruntung. Coba lagi di transaksi berikutnya!',
                'game_type'  => 'spin',
                'game_result' => 'lose',
            ]);
        }

        // User menang — ambil reward
        $reward = $discount->discountRewards->first();

        if (! $reward) {
            return response()->json(['message' => 'Konfigurasi reward tidak ditemukan.'], 500);
        }

        // Jika pool dan customer harus pilih sendiri
        if ($reward->is_pool && $reward->customer_can_choose) {
            $pools = $reward->discountRewardPools
                ->where('is_active', true)
                ->sortBy('sort_order')
                ->values()
                ->map(fn ($p) => [
                    'id'          => $p->id,
                    'label'       => $p->label,
                    'image_url'   => $p->image_url,
                    'fixed_price' => $p->fixed_price ?? $reward->fixed_price,
                    'is_free'     => ($p->fixed_price ?? $reward->fixed_price) == 0,
                ]);

            return response()->json([
                'won'            => true,
                'game_type'      => 'spin',
                'game_result'    => 'win',
                'needs_choice'   => true,
                'max_choices'    => $reward->max_choices,
                'message'        => 'Selamat! Pilih hadiah kamu.',
                'reward_pools'   => $pools,
                'discount_id'    => $discount->id,
                'reward_id'      => $reward->id,
            ]);
        }

        // Auto-assign reward (tidak perlu pilih)
        $rewardPool = $this->pickRewardFromPool($reward);
        $amount     = $this->calculateRewardAmount($reward, $rewardPool, $cart);

        CartDiscount::create([
            'cart_id'          => $cart->id,
            'discount_type_id' => $discount->id,
            'applied_amount'   => $amount,
        ]);

        return response()->json([
            'won'            => true,
            'game_type'      => 'spin',
            'game_result'    => 'win',
            'needs_choice'   => false,
            'message'        => 'Selamat! Kamu mendapat hadiah.',
            'reward' => [
                'label'          => $rewardPool ? $rewardPool->label : $discount->name,
                'applied_amount' => $amount,
                'amount_formatted' => 'Rp ' . number_format($amount, 0, ',', '.'),
            ],
        ]);
    }

    /**
     * POST /pos/discounts/game/choose
     *
     * Customer memilih reward dari pool setelah menang game.
     *
     * Body:
     * {
     *   "cart_id"          : "uuid",
     *   "discount_type_id" : "uuid",
     *   "reward_pool_id"   : "uuid"
     * }
     */
    public function chooseReward(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cart_id'          => 'required|uuid|exists:carts,id',
            'discount_type_id' => 'required|uuid|exists:discount_types,id',
            'reward_pool_id'   => 'required|uuid|exists:discount_reward_pools,id',
        ]);

        $store    = $request->attributes->get('active_store');
        $cart     = Cart::findOrFail($validated['cart_id']);
        $discount = DiscountType::with('discountRewards.discountRewardPools')
            ->findOrFail($validated['discount_type_id']);
        $pool     = DiscountRewardPool::findOrFail($validated['reward_pool_id']);

        abort_if($cart->store_id !== $store->id, 403);

        $reward = $discount->discountRewards->first();
        abort_if(! $reward, 500, 'Konfigurasi reward tidak ditemukan.');
        abort_if($pool->discount_reward_id !== $reward->id, 422, 'Reward pool tidak valid.');

        $amount = $this->calculateRewardAmount($reward, $pool, $cart);

        CartDiscount::create([
            'cart_id'          => $cart->id,
            'discount_type_id' => $discount->id,
            'applied_amount'   => $amount,
        ]);

        $newTotal = $this->getCartTotal($cart->fresh()->load('cartDiscounts'));

        return response()->json([
            'message'  => 'Reward berhasil diterapkan.',
            'reward' => [
                'label'           => $pool->label,
                'applied_amount'  => $amount,
                'amount_formatted' => 'Rp ' . number_format($amount, 0, ',', '.'),
            ],
            'new_total'           => $newTotal,
            'new_total_formatted' => 'Rp ' . number_format($newTotal, 0, ',', '.'),
        ]);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    /**
     * Cek apakah diskon eligible untuk cart ini.
     * Kembalikan: ['eligible' => bool, 'estimated_amount' => float, ...]
     */
    private function checkEligibility(
        DiscountType $discount,
        Cart $cart,
        float $cartTotal,
        int $cartQty,
        string $storeId
    ): array {
        $result = [
            'eligible'          => false,
            'estimated_amount'  => 0,
            'near_eligible'     => false,
            'near_miss_message' => null,
            'reason'            => null,
            'reward_preview'    => null,
        ];

        // Cek min purchase amount
        if ($discount->min_purchase_amount && $cartTotal < $discount->min_purchase_amount) {
            $gap = $discount->min_purchase_amount - $cartTotal;
            $result['near_eligible']     = $gap <= ($discount->min_purchase_amount * 0.2); // 20% dari threshold
            $result['near_miss_message'] = 'Tambah Rp ' . number_format($gap, 0, ',', '.') . ' lagi untuk dapat diskon ini!';
            $result['reason']            = 'Minimum pembelian belum terpenuhi.';
            return $result;
        }

        // Cek min purchase quantity
        if ($discount->min_purchase_quantity && $cartQty < $discount->min_purchase_quantity) {
            $result['near_eligible']     = ($cartQty + 1) >= $discount->min_purchase_quantity;
            $result['near_miss_message'] = 'Tambah ' . ($discount->min_purchase_quantity - $cartQty) . ' item lagi!';
            $result['reason']            = 'Minimum jumlah item belum terpenuhi.';
            return $result;
        }

        // Cek applicability — apakah variant/intensity/size item di cart cocok
        $applicabilities = $discount->discountApplicabilities;
        if ($applicabilities->isNotEmpty()) {
            $match = $applicabilities->first(fn ($a) =>
                (! $a->variant_id   || $a->variant_id   === $cart->variant_id)   &&
                (! $a->intensity_id || $a->intensity_id === $cart->intensity_id) &&
                (! $a->size_id      || $a->size_id      === $cart->size_id)
            );

            if (! $match) {
                $result['reason'] = 'Produk di cart tidak termasuk dalam syarat diskon ini.';
                return $result;
            }
        }

        // Eligible — hitung estimasi nominal diskon
        $result['eligible'] = true;

        switch ($discount->type) {
            case 'percentage':
                $maxDiscount = $discount->max_discount_amount;
                $rawAmount   = $cartTotal * ($discount->value / 100);
                $result['estimated_amount'] = $maxDiscount
                    ? min($rawAmount, $maxDiscount)
                    : $rawAmount;
                break;

            case 'fixed_amount':
                $result['estimated_amount'] = min($discount->value, $cartTotal);
                break;

            case 'buy_x_get_y':
                // Estimasi: 1 item gratis (bisa di-adjust sesuai intensitas)
                $result['estimated_amount'] = $cart->unit_price; // harga 1 parfum
                $result['reward_preview']   = 'Gratis ' . ($discount->get_quantity ?? 1) . ' parfum';
                break;

            case 'free_product':
            case 'game_reward':
                $result['estimated_amount'] = 0; // tidak bisa diestimasi sampai reward dipilih
                $result['reward_preview']   = 'Hadiah kejutan!';
                break;

            default:
                $result['estimated_amount'] = $discount->value;
        }

        return $result;
    }

    private function getCartTotal(Cart $cart): float
    {
        $perfumeSubtotal   = $cart->unit_price * $cart->qty;
        $packagingSubtotal = CartPackaging::where('cart_id', $cart->id)
            ->sum(DB::raw('qty * unit_price'));
        $discountTotal     = \App\Models\CartDiscount::where('cart_id', $cart->id)
            ->sum('applied_amount');

        return max(0, $perfumeSubtotal + $packagingSubtotal - $discountTotal);
    }

    private function pickRewardFromPool(\App\Models\DiscountReward $reward): ?\App\Models\DiscountRewardPool
    {
        $pools = $reward->discountRewardPools->where('is_active', true);

        if ($pools->isEmpty()) return null;

        // Weighted random berdasarkan probability
        $totalWeight = $pools->sum('probability') ?: $pools->count();
        $random      = rand(1, $totalWeight);
        $cumulative  = 0;

        foreach ($pools as $pool) {
            $cumulative += ($pool->probability ?? 1);
            if ($random <= $cumulative) {
                return $pool;
            }
        }

        return $pools->last();
    }

    private function calculateRewardAmount(
        \App\Models\DiscountReward $reward,
        ?\App\Models\DiscountRewardPool $pool,
        Cart $cart
    ): float {
        $fixedPrice = $pool?->fixed_price ?? $reward->fixed_price;

        if ($fixedPrice !== null) {
            // fixed_price = 0 artinya gratis (nominal diskon = harga normal)
            return max(0, $cart->unit_price - $fixedPrice);
        }

        if ($reward->discount_percentage) {
            return $cart->unit_price * ($reward->discount_percentage / 100);
        }

        return 0;
    }
}
