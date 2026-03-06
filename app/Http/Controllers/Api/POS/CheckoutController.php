<?php

namespace App\Http\Controllers\Api\POS;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartDiscount;
use App\Models\CartPackaging;
use App\Models\CartPayment;
use App\Models\DiscountUsage;
use App\Models\IntensitySizeQuantity;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SaleDiscount;
use App\Models\SaleItem;
use App\Models\SaleItemPackaging;
use App\Models\SalePayment;
use App\Models\StockMovement;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;
use App\Models\VariantRecipe;
use App\Models\Customer;
use App\Models\CustomerPointLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * CheckoutController
 *
 * POST /pos/checkout     → Finalisasi transaksi
 * GET  /pos/checkout/{sale}/receipt → Data struk
 * GET  /pos/payment-methods → Daftar metode pembayaran
 */
class CheckoutController extends Controller
{
    /**
     * GET /pos/payment-methods
     *
     * Daftar metode pembayaran aktif, diurutkan sort_order.
     */
    public function paymentMethods(Request $request): JsonResponse
    {
        $methods = PaymentMethod::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'type', 'has_admin_fee', 'admin_fee_pct', 'can_give_change', 'sort_order']);

        return response()->json(['data' => $methods]);
    }

    /**
     * POST /pos/checkout
     *
     * Proses checkout dari cart ke sale final.
     *
     * Langkah:
     *   1. Validasi cart (milik kasir, store sama, tidak expired)
     *   2. Validasi pembayaran cukup
     *   3. Mulai DB transaction:
     *      a. Buat Sale header
     *      b. Buat SaleItem (parfum)
     *      c. Buat SaleItemPackagings
     *      d. Buat SaleDiscounts
     *      e. Buat SalePayments
     *      f. Deduct stok bahan via stock_movements (made-to-order)
     *      g. Deduct stok packaging
     *      h. Catat DiscountUsages
     *      i. Update poin customer
     *      j. Hapus cart
     *   4. Return sale + struk
     *
     * Body: { "cart_id": "uuid" }
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cart_id' => 'required|uuid|exists:carts,id',
        ]);

        $store   = $request->attributes->get('active_store');
        $cashier = $request->user();

        $cart = Cart::with([
            'variant',
            'intensity',
            'size',
            'customer',
            'salesPerson',
            'cartPackagings.packagingMaterial',
            'cartDiscounts.discountType',
            'cartPayments.paymentMethod',
            'product',
        ])->findOrFail($validated['cart_id']);

        // Validasi kepemilikan cart
        abort_if($cart->cashier_id !== $cashier->id || $cart->store_id !== $store->id, 403);
        abort_if($cart->hold_id, 422, 'Cart masih dalam status parkir. Resume terlebih dahulu.');

        // Validasi pembayaran cukup
        $cartTotal  = $this->calculateCartTotal($cart);
        $totalPaid  = $cart->cartPayments->sum(fn ($p) => $p->amount + $p->admin_fee);
        $changeAmount = max(0, $totalPaid - $cartTotal);

        if ($totalPaid < $cartTotal) {
            return response()->json([
                'message'       => 'Pembayaran belum cukup.',
                'cart_total'    => $cartTotal,
                'total_paid'    => $totalPaid,
                'remaining_due' => $cartTotal - $totalPaid,
            ], 422);
        }

        // Mulai DB transaction
        $sale = DB::transaction(function () use ($cart, $store, $cashier, $cartTotal, $totalPaid, $changeAmount) {

            // ── [a] Hitung semua komponen harga ──────────────────────────────
            $perfumeSubtotal   = $cart->unit_price * $cart->qty;
            $packagingSubtotal = $cart->cartPackagings->sum(fn ($cp) => $cp->qty * $cp->unit_price);
            $subtotal          = $perfumeSubtotal + $packagingSubtotal;
            $discountAmount    = $cart->cartDiscounts->sum('applied_amount');

            // Hitung COGS parfum dari ingredient stocks
            list($cogsPerUnit, $cogsTotal) = $this->calculatePerfumeCogs(
                $cart->variant_id,
                $cart->intensity_id,
                $cart->size_id,
                $store->id,
                $cart->qty
            );

            $cogsPackaging = $cart->cartPackagings->sum(fn ($cp) =>
                ($cp->packagingMaterial?->average_cost ?? 0) * $cp->qty
            );

            $grossProfit    = $cartTotal - $cogsTotal - $cogsPackaging;
            $grossMarginPct = $cartTotal > 0 ? round(($grossProfit / $cartTotal) * 100, 2) : 0;

            // Poin earned (1 poin per Rp 10.000, contoh sederhana)
            $pointsEarned = $cart->customer ? (int) floor($cartTotal / 10000) : 0;

            // ── [b] Buat Sale header ─────────────────────────────────────────
            $sale = Sale::create([
                'sale_number'             => $this->generateSaleNumber(),
                'store_id'                => $store->id,
                'cashier_id'              => $cashier->id,
                'cashier_name'            => $cashier->name,
                'sales_person_id'         => $cart->sales_person_id,
                'sales_person_name'       => $cart->salesPerson?->name,
                'customer_id'             => $cart->customer_id,
                'customer_name'           => $cart->customer?->name,
                'sold_at'                 => now(),
                'subtotal_perfume'        => $perfumeSubtotal,
                'subtotal_packaging'      => $packagingSubtotal,
                'subtotal'                => $subtotal,
                'discount_amount'         => $discountAmount,
                'tax_amount'              => 0,
                'total'                   => $cartTotal,
                'amount_paid'             => $totalPaid,
                'change_amount'           => $changeAmount,
                'cogs_perfume'            => $cogsTotal,
                'cogs_packaging'          => $cogsPackaging,
                'cogs_total'              => $cogsTotal + $cogsPackaging,
                'gross_profit'            => $grossProfit,
                'gross_margin_pct'        => $grossMarginPct,
                'points_earned'           => $pointsEarned,
                'points_redeemed'         => 0,
                'points_redemption_value' => 0,
                'status'                  => 'completed',
            ]);

            // ── [c] Buat SaleItem (parfum) ───────────────────────────────────
            $saleItem = SaleItem::create([
                'sale_id'               => $sale->id,
                'product_id'            => $cart->product_id, // nullable (made-to-order)
                'product_name'          => $this->buildProductName($cart),
                'product_sku'           => $cart->product?->sku,
                'variant_name'          => $cart->variant->name,
                'intensity_code'        => $cart->intensity->code,
                'size_ml'               => $cart->size->volume_ml,
                'variant_id_snapshot'   => $cart->variant_id,
                'intensity_id_snapshot' => $cart->intensity_id,
                'size_id_snapshot'      => $cart->size_id,
                'qty'                   => $cart->qty,
                'unit_price'            => $cart->unit_price,
                'item_discount'         => 0, // diskon di level sale, bukan item
                'subtotal'              => $perfumeSubtotal,
                'cogs_per_unit'         => $cogsPerUnit,
                'cogs_total'            => $cogsTotal,
                'line_gross_profit'     => $perfumeSubtotal - $cogsTotal,
                'line_gross_margin_pct' => $perfumeSubtotal > 0
                    ? round((($perfumeSubtotal - $cogsTotal) / $perfumeSubtotal) * 100, 2)
                    : 0,
            ]);

            // ── [d] Buat SaleItemPackagings ──────────────────────────────────
            foreach ($cart->cartPackagings as $cp) {
                $pkgCogs = ($cp->packagingMaterial?->average_cost ?? 0) * $cp->qty;

                SaleItemPackaging::create([
                    'sale_item_id'          => $saleItem->id,
                    'packaging_material_id' => $cp->packaging_material_id,
                    'packaging_name'        => $cp->packagingMaterial->name,
                    'packaging_code'        => $cp->packagingMaterial->code,
                    'qty'                   => $cp->qty,
                    'unit_price'            => $cp->unit_price,
                    'subtotal'              => $cp->qty * $cp->unit_price,
                    'unit_cost'             => $cp->packagingMaterial->average_cost ?? 0,
                    'cogs_total'            => $pkgCogs,
                    'line_gross_profit'     => ($cp->qty * $cp->unit_price) - $pkgCogs,
                    'line_gross_margin_pct' => ($cp->qty * $cp->unit_price) > 0
                        ? round(((($cp->qty * $cp->unit_price) - $pkgCogs) / ($cp->qty * $cp->unit_price)) * 100, 2)
                        : 0,
                ]);
            }

            // ── [e] Buat SaleDiscounts ───────────────────────────────────────
            foreach ($cart->cartDiscounts as $cd) {
                SaleDiscount::create([
                    'sale_id'           => $sale->id,
                    'discount_type_id'  => $cd->discount_type_id,
                    'discount_code'     => $cd->discountType->code,
                    'discount_name'     => $cd->discountType->name,
                    'discount_category' => $cd->discountType->type,
                    'discount_value'    => $cd->discountType->value,
                    'applied_amount'    => $cd->applied_amount,
                ]);

                // Catat DiscountUsage
                DiscountUsage::create([
                    'discount_type_id'  => $cd->discount_type_id,
                    'order_id'          => $sale->id,
                    'store_id'          => $store->id,
                    'customer_id'       => $cart->customer_id,
                    'discount_amount'   => $cd->applied_amount,
                    'original_amount'   => $subtotal,
                    'final_amount'      => $cartTotal,
                    'is_game_reward'    => $cd->discountType->is_game_reward,
                    'used_at'           => now(),
                ]);
            }

            // ── [f] Buat SalePayments ────────────────────────────────────────
            foreach ($cart->cartPayments as $cp) {
                SalePayment::create([
                    'sale_id'             => $sale->id,
                    'payment_method_id'   => $cp->payment_method_id,
                    'amount'              => $cp->amount,
                    'admin_fee'           => $cp->admin_fee,
                    'payment_method_name' => $cp->paymentMethod->name,
                    'payment_method_type' => $cp->paymentMethod->type,
                    'reference_number'    => $cp->reference_number,
                    'payment_status'      => 'completed',
                    'settled_at'          => now(),
                ]);
            }

            // ── [g] Deduct stok bahan (made-to-order: hitung dari recipe) ───
            $this->deductIngredientStock($cart, $store->id, $sale->id, $cashier->id);

            // ── [h] Deduct stok packaging ────────────────────────────────────
            $this->deductPackagingStock($cart, $store->id, $sale->id, $cashier->id);

            // ── [i] Update poin customer ─────────────────────────────────────
            if ($cart->customer && $pointsEarned > 0) {
                $this->addCustomerPoints($cart->customer, $pointsEarned, $sale->id);
                $sale->update(['points_earned' => $pointsEarned]);
            }

            // ── [j] Hapus cart ───────────────────────────────────────────────
            $cart->delete();

            return $sale;
        });

        return response()->json([
            'message'     => 'Transaksi berhasil.',
            'sale_id'     => $sale->id,
            'sale_number' => $sale->sale_number,
            'total'       => $sale->total,
            'change'      => $sale->change_amount,
        ], 201);
    }

    /**
     * GET /pos/checkout/{sale}/receipt
     *
     * Kembalikan data lengkap untuk struk / receipt.
     */
    public function receipt(Request $request, Sale $sale): JsonResponse
    {
        $store = $request->attributes->get('active_store');

        abort_if($sale->store_id !== $store->id, 403);

        $sale->load([
            'saleItems.saleItemPackagings',
            'saleDiscounts',
            'salePayments',
            'customer:id,name,phone,tier,points',
        ]);

        return response()->json([
            'data' => [
                'sale_number'    => $sale->sale_number,
                'store_name'     => $store->name,
                'cashier_name'   => $sale->cashier_name,
                'sales_person'   => $sale->sales_person_name,
                'customer'       => $sale->customer
                    ? ['name' => $sale->customer_name, 'phone' => $sale->customer?->phone]
                    : null,
                'sold_at'        => $sale->sold_at,
                'items'          => $sale->saleItems->map(fn ($item) => [
                    'name'       => $item->product_name,
                    'qty'        => $item->qty,
                    'unit_price' => $item->unit_price,
                    'subtotal'   => $item->subtotal,
                    'packaging'  => $item->saleItemPackagings->map(fn ($p) => [
                        'name'     => $p->packaging_name,
                        'qty'      => $p->qty,
                        'subtotal' => $p->subtotal,
                    ]),
                ]),
                'subtotal'       => $sale->subtotal,
                'discounts'      => $sale->saleDiscounts->map(fn ($d) => [
                    'name'   => $d->discount_name,
                    'amount' => $d->applied_amount,
                ]),
                'discount_total' => $sale->discount_amount,
                'total'          => $sale->total,
                'payments'       => $sale->salePayments->map(fn ($p) => [
                    'method' => $p->payment_method_name,
                    'amount' => $p->amount,
                ]),
                'change'         => $sale->change_amount,
                'points_earned'  => $sale->points_earned,
            ],
        ]);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private function calculateCartTotal(Cart $cart): float
    {
        $perfumeSubtotal   = $cart->unit_price * $cart->qty;
        $packagingSubtotal = $cart->cartPackagings->sum(fn ($cp) => $cp->qty * $cp->unit_price);
        $discountTotal     = $cart->cartDiscounts->sum('applied_amount');

        return max(0, $perfumeSubtotal + $packagingSubtotal - $discountTotal);
    }

    private function buildProductName(Cart $cart): string
    {
        return "{$cart->variant->name} - {$cart->intensity->code} - {$cart->size->volume_ml}ml";
    }

    private function generateSaleNumber(): string
    {
        $date     = now()->format('Ymd');
        $sequence = Sale::whereDate('sold_at', today())->count() + 1;
        return 'INV/' . $date . '/' . str_pad($sequence, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Hitung COGS parfum dari VariantRecipe + IntensitySizeQuantity
     * Return: [cogs_per_unit, cogs_total]
     */
    private function calculatePerfumeCogs(
        string $variantId,
        string $intensityId,
        string $sizeId,
        string $storeId,
        int    $qty
    ): array {
        $isq = IntensitySizeQuantity::where('intensity_id', $intensityId)
            ->where('size_id', $sizeId)
            ->first();

        if (! $isq) return [0, 0];

        $recipes = VariantRecipe::with('ingredient')
            ->where('variant_id', $variantId)
            ->where('intensity_id', $intensityId)
            ->get();

        $cogsPerUnit = 0;
        $baseOil     = 30; // base recipe = 30ml oil

        foreach ($recipes as $recipe) {
            // Scale factor berdasarkan tipe bahan
            $ingredientType = $recipe->ingredient?->ingredientCategory?->ingredient_type ?? 'other';

            $targetQty = match ($ingredientType) {
                'oil'     => $isq->oil_quantity,
                'alcohol' => $isq->alcohol_quantity,
                default   => $isq->total_volume,
            };

            $scaleFactor = $baseOil > 0 ? ($targetQty / $baseOil) : 1;
            $scaledQty   = $recipe->base_quantity * $scaleFactor;
            $unitCost    = $recipe->ingredient?->average_cost ?? 0;
            $cogsPerUnit += $scaledQty * $unitCost;
        }

        return [round($cogsPerUnit, 2), round($cogsPerUnit * $qty, 2)];
    }

    /**
     * Deduct stok bahan dari store dan catat di stock_movements
     */
    private function deductIngredientStock(Cart $cart, string $storeId, string $saleId, int $cashierId): void
    {
        $isq = IntensitySizeQuantity::where('intensity_id', $cart->intensity_id)
            ->where('size_id', $cart->size_id)
            ->first();

        if (! $isq) return;

        $recipes = VariantRecipe::with('ingredient.ingredientCategory')
            ->where('variant_id', $cart->variant_id)
            ->where('intensity_id', $cart->intensity_id)
            ->get();

        $baseOil = 30;

        foreach ($recipes as $recipe) {
            $ingredientType = $recipe->ingredient?->ingredientCategory?->ingredient_type ?? 'other';

            $targetQty = match ($ingredientType) {
                'oil'     => $isq->oil_quantity,
                'alcohol' => $isq->alcohol_quantity,
                default   => $isq->total_volume,
            };

            $scaleFactor = $baseOil > 0 ? ($targetQty / $baseOil) : 1;
            $scaledQty   = (int) round($recipe->base_quantity * $scaleFactor * $cart->qty);

            $stock = StoreIngredientStock::firstOrCreate(
                ['store_id' => $storeId, 'ingredient_id' => $recipe->ingredient_id],
                ['quantity' => 0, 'average_cost' => 0, 'total_value' => 0]
            );

            $qtyBefore = $stock->quantity;
            $qtyAfter  = $qtyBefore - $scaledQty;
            $unitCost  = $recipe->ingredient->average_cost ?? 0;

            $stock->update([
                'quantity'      => $qtyAfter,
                'total_value'   => max(0, $qtyAfter * $stock->average_cost),
                'last_out_at'   => now(),
                'last_out_by'   => $cashierId,
                'last_out_qty'  => $scaledQty,
            ]);

            // Catat stock movement
            StockMovement::create([
                'location_type'    => 'store',
                'location_id'      => $storeId,
                'item_type'        => 'ingredient',
                'item_id'          => $recipe->ingredient_id,
                'movement_type'    => 'sale_out',
                'qty_change'       => -$scaledQty,
                'qty_before'       => $qtyBefore,
                'qty_after'        => $qtyAfter,
                'unit_cost'        => $unitCost,
                'total_cost'       => $scaledQty * $unitCost,
                'avg_cost_before'  => $stock->average_cost,
                'avg_cost_after'   => $stock->average_cost,
                'reference_type'   => 'App\\Models\\Sale',
                'reference_id'     => $saleId,
                'reference_number' => Sale::find($saleId)?->sale_number,
                'movement_date'    => now()->toDateString(),
                'created_by'       => $cashierId,
            ]);
        }
    }

    /**
     * Deduct stok packaging dari store
     */
    private function deductPackagingStock(Cart $cart, string $storeId, string $saleId, int $cashierId): void
    {
        foreach ($cart->cartPackagings as $cp) {
            $stock = StorePackagingStock::firstOrCreate(
                ['store_id' => $storeId, 'packaging_material_id' => $cp->packaging_material_id],
                ['quantity' => 0, 'average_cost' => 0, 'total_value' => 0]
            );

            $qtyBefore = $stock->quantity;
            $qtyAfter  = $qtyBefore - $cp->qty;
            $unitCost  = $cp->packagingMaterial?->average_cost ?? 0;

            $stock->update([
                'quantity'     => $qtyAfter,
                'total_value'  => max(0, $qtyAfter * $stock->average_cost),
                'last_out_at'  => now(),
                'last_out_by'  => $cashierId,
                'last_out_qty' => $cp->qty,
            ]);

            StockMovement::create([
                'location_type'    => 'store',
                'location_id'      => $storeId,
                'item_type'        => 'packaging_material',
                'item_id'          => $cp->packaging_material_id,
                'movement_type'    => 'sale_out',
                'qty_change'       => -$cp->qty,
                'qty_before'       => $qtyBefore,
                'qty_after'        => $qtyAfter,
                'unit_cost'        => $unitCost,
                'total_cost'       => $cp->qty * $unitCost,
                'avg_cost_before'  => $stock->average_cost,
                'avg_cost_after'   => $stock->average_cost,
                'reference_type'   => 'App\\Models\\Sale',
                'reference_id'     => $saleId,
                'reference_number' => Sale::find($saleId)?->sale_number,
                'movement_date'    => now()->toDateString(),
                'created_by'       => $cashierId,
            ]);
        }
    }

    /**
     * Tambah poin ke customer
     */
    private function addCustomerPoints(Customer $customer, int $points, string $saleId): void
    {
        $newBalance = $customer->points + $points;

        CustomerPointLedger::create([
            'customer_id'    => $customer->id,
            'type'           => 'earned',
            'points'         => $points,
            'balance_after'  => $newBalance,
            'reference_type' => 'App\\Models\\Sale',
            'reference_id'   => $saleId,
            'notes'          => 'Poin dari transaksi POS',
        ]);

        $customer->update([
            'points'                 => $newBalance,
            'lifetime_points_earned' => $customer->lifetime_points_earned + $points,
        ]);
    }
}
