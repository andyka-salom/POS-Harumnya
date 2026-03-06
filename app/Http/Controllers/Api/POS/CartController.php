<?php

namespace App\Http\Controllers\Api\POS;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartPackaging;
use App\Models\CartPayment;
use App\Models\Customer;
use App\Models\IntensitySizePrice;
use App\Models\Intensity;
use App\Models\PackagingMaterial;
use App\Models\PaymentMethod;
use App\Models\SalesPerson;
use App\Models\Size;
use App\Models\Variant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * CartController
 *
 * Mengelola cart aktif & cart parkir (hold).
 * Satu kasir bisa punya banyak cart (1 aktif + beberapa diparkir).
 */
class CartController extends Controller
{
    /**
     * GET /pos/cart
     *
     * List semua cart milik kasir ini di store aktif.
     * Pisahkan antara cart aktif dan cart yang diparkir.
     */
    public function index(Request $request): JsonResponse
    {
        $store    = $request->attributes->get('active_store');
        $cashier  = $request->user();

        $carts = Cart::query()
            ->with([
                'variant:id,name,code',
                'intensity:id,name,code',
                'size:id,name,volume_ml',
                'customer:id,name,phone,tier,points',
                'salesPerson:id,name,code',
                'cartPackagings.packagingMaterial:id,name,code',
                'cartDiscounts.discountType:id,name,code,type',
            ])
            ->where('cashier_id', $cashier->id)
            ->where('store_id', $store->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $active = $carts->whereNull('hold_id')->values();
        $held   = $carts->whereNotNull('hold_id')->values();

        return response()->json([
            'active' => $active->map(fn ($c) => $this->formatCart($c)),
            'held'   => $held->map(fn ($c) => $this->formatCart($c)),
        ]);
    }

    /**
     * POST /pos/cart
     *
     * Buat cart baru.
     * Harga diambil otomatis dari intensity_size_prices.
     *
     * Body:
     * {
     *   "variant_id"   : "uuid",
     *   "intensity_id" : "uuid",
     *   "size_id"      : "uuid",
     *   "qty"          : 1,          // default 1
     *   "customer_id"  : "uuid",     // opsional
     *   "sales_person_id" : "uuid"   // opsional
     * }
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'variant_id'      => 'required|uuid|exists:variants,id',
            'intensity_id'    => 'required|uuid|exists:intensities,id',
            'size_id'         => 'required|uuid|exists:sizes,id',
            'qty'             => 'sometimes|integer|min:1|max:99',
            'customer_id'     => 'nullable|uuid|exists:customers,id',
            'sales_person_id' => 'nullable|uuid|exists:sales_people,id',
        ]);

        $store   = $request->attributes->get('active_store');
        $cashier = $request->user();

        // Ambil harga dari intensity_size_prices
        $isp = IntensitySizePrice::query()
            ->where('intensity_id', $validated['intensity_id'])
            ->where('size_id', $validated['size_id'])
            ->where('is_active', true)
            ->firstOrFail();

        // Cari apakah sudah ada produk yang di-generate untuk kombinasi ini
        $product = \App\Models\Product::query()
            ->where('variant_id', $validated['variant_id'])
            ->where('intensity_id', $validated['intensity_id'])
            ->where('size_id', $validated['size_id'])
            ->where('is_active', true)
            ->first();

        $cart = Cart::create([
            'cashier_id'      => $cashier->id,
            'store_id'        => $store->id,
            'variant_id'      => $validated['variant_id'],
            'intensity_id'    => $validated['intensity_id'],
            'size_id'         => $validated['size_id'],
            'product_id'      => $product?->id, // null jika belum di-generate (made-to-order)
            'unit_price'      => $isp->price,
            'qty'             => $validated['qty'] ?? 1,
            'customer_id'     => $validated['customer_id'] ?? null,
            'sales_person_id' => $validated['sales_person_id'] ?? null,
        ]);

        $cart->load([
            'variant:id,name,code',
            'intensity:id,name,code',
            'size:id,name,volume_ml',
            'customer:id,name,phone,tier,points',
            'salesPerson:id,name,code',
        ]);

        return response()->json([
            'message' => 'Cart berhasil dibuat.',
            'data'    => $this->formatCart($cart),
        ], 201);
    }

    /**
     * GET /pos/cart/{cart}
     *
     * Detail cart lengkap: item parfum, packaging, diskon, payment buffer, summary total.
     */
    public function show(Request $request, Cart $cart): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        $cart->load([
            'variant:id,name,code,image',
            'intensity:id,name,code',
            'size:id,name,volume_ml',
            'customer:id,name,phone,tier,points',
            'salesPerson:id,name,code',
            'cartPackagings.packagingMaterial:id,name,code,image,unit',
            'cartDiscounts.discountType:id,name,code,type,value',
            'cartPayments.paymentMethod:id,name,code,type',
            'product:id,sku,name',
        ]);

        return response()->json([
            'data' => $this->formatCartDetail($cart),
        ]);
    }

    /**
     * DELETE /pos/cart/{cart}
     *
     * Batalkan/hapus cart.
     */
    public function destroy(Request $request, Cart $cart): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        $cart->delete();

        return response()->json(['message' => 'Cart berhasil dihapus.']);
    }

    /**
     * PUT /pos/cart/{cart}/customer
     *
     * Set atau ganti customer di cart.
     * Body: { "customer_id": "uuid" } atau { "customer_id": null } untuk hapus
     */
    public function setCustomer(Request $request, Cart $cart): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        $validated = $request->validate([
            'customer_id' => 'nullable|uuid|exists:customers,id',
        ]);

        $cart->update(['customer_id' => $validated['customer_id']]);

        $customer = $validated['customer_id']
            ? Customer::find($validated['customer_id'], ['id', 'name', 'phone', 'tier', 'points'])
            : null;

        return response()->json([
            'message'  => $customer ? 'Customer berhasil di-set.' : 'Customer berhasil dihapus dari cart.',
            'customer' => $customer,
        ]);
    }

    /**
     * PUT /pos/cart/{cart}/sales-person
     *
     * Set atau ganti sales person di cart.
     * Body: { "sales_person_id": "uuid" } atau { "sales_person_id": null }
     */
    public function setSalesPerson(Request $request, Cart $cart): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        $validated = $request->validate([
            'sales_person_id' => 'nullable|uuid|exists:sales_people,id',
        ]);

        $cart->update(['sales_person_id' => $validated['sales_person_id']]);

        $sp = $validated['sales_person_id']
            ? SalesPerson::find($validated['sales_person_id'], ['id', 'name', 'code'])
            : null;

        return response()->json([
            'message'      => $sp ? 'Sales person berhasil di-set.' : 'Sales person dihapus dari cart.',
            'sales_person' => $sp,
        ]);
    }

    /**
     * POST /pos/cart/{cart}/hold
     *
     * Parkir cart. Cart akan tetap ada dan bisa di-resume nanti.
     * Body: { "hold_label": "Antrian A" }
     */
    public function hold(Request $request, Cart $cart): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        if ($cart->hold_id) {
            return response()->json(['message' => 'Cart sudah diparkir.'], 422);
        }

        $validated = $request->validate([
            'hold_label' => 'nullable|string|max:100',
        ]);

        $cart->update([
            'hold_id'         => (string) Str::uuid(),
            'hold_label'      => $validated['hold_label'] ?? null,
            'held_at'         => now(),
            'cart_expires_at' => now()->addHours(2),
        ]);

        return response()->json([
            'message'    => 'Cart berhasil diparkir.',
            'hold_id'    => $cart->hold_id,
            'hold_label' => $cart->hold_label,
            'expires_at' => $cart->cart_expires_at,
        ]);
    }

    /**
     * POST /pos/cart/{cart}/resume
     *
     * Ambil kembali cart yang diparkir.
     * Cart akan kembali menjadi aktif (hold_id di-clear).
     */
    public function resume(Request $request, Cart $cart): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        if (! $cart->hold_id) {
            return response()->json(['message' => 'Cart tidak dalam status parkir.'], 422);
        }

        if ($cart->cart_expires_at && $cart->cart_expires_at->isPast()) {
            return response()->json(['message' => 'Cart sudah expired. Silakan buat cart baru.'], 422);
        }

        $cart->update([
            'hold_id'         => null,
            'hold_label'      => null,
            'held_at'         => null,
            'cart_expires_at' => null,
        ]);

        return response()->json([
            'message' => 'Cart berhasil di-resume.',
            'data'    => $this->formatCart($cart->fresh()),
        ]);
    }

    /**
     * POST /pos/cart/{cart}/packaging
     *
     * Tambah atau update packaging add-on ke cart.
     * Jika packaging sudah ada, qty akan di-update.
     * Body:
     * {
     *   "packaging_material_id": "uuid",
     *   "qty": 1
     * }
     */
    public function addPackaging(Request $request, Cart $cart): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        $validated = $request->validate([
            'packaging_material_id' => 'required|uuid|exists:packaging_materials,id',
            'qty'                   => 'required|integer|min:1|max:99',
        ]);

        $packaging = PackagingMaterial::where('id', $validated['packaging_material_id'])
            ->where('is_active', true)
            ->where('is_available_as_addon', true)
            ->firstOrFail();

        $cartPackaging = CartPackaging::updateOrCreate(
            [
                'cart_id'               => $cart->id,
                'packaging_material_id' => $packaging->id,
            ],
            [
                'qty'        => $validated['qty'],
                'unit_price' => $packaging->selling_price,
            ]
        );

        return response()->json([
            'message' => 'Packaging berhasil ditambahkan.',
            'data'    => [
                'id'              => $cartPackaging->id,
                'packaging_id'    => $packaging->id,
                'packaging_name'  => $packaging->name,
                'qty'             => $cartPackaging->qty,
                'unit_price'      => $cartPackaging->unit_price,
                'subtotal'        => $cartPackaging->qty * $cartPackaging->unit_price,
                'price_formatted' => 'Rp ' . number_format($cartPackaging->unit_price, 0, ',', '.'),
            ],
        ]);
    }

    /**
     * DELETE /pos/cart/{cart}/packaging/{packaging}
     *
     * Hapus packaging dari cart.
     */
    public function removePackaging(Request $request, Cart $cart, CartPackaging $packaging): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        if ($packaging->cart_id !== $cart->id) {
            return response()->json(['message' => 'Packaging tidak ditemukan di cart ini.'], 404);
        }

        $packaging->delete();

        return response()->json(['message' => 'Packaging berhasil dihapus dari cart.']);
    }

    /**
     * POST /pos/cart/{cart}/payments
     *
     * Tambah payment ke buffer (split payment).
     * Bisa dipanggil berkali-kali untuk split payment.
     * Body:
     * {
     *   "payment_method_id" : "uuid",
     *   "amount"            : 85000,
     *   "reference_number"  : "TRX12345"  // opsional (untuk transfer/QRIS)
     * }
     */
    public function addPayment(Request $request, Cart $cart): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        $validated = $request->validate([
            'payment_method_id' => 'required|uuid|exists:payment_methods,id',
            'amount'            => 'required|numeric|min:0.01',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        $method = PaymentMethod::where('id', $validated['payment_method_id'])
            ->where('is_active', true)
            ->firstOrFail();

        // Hitung admin fee
        $adminFee = $method->has_admin_fee
            ? round($validated['amount'] * ($method->admin_fee_pct / 100), 2)
            : 0;

        $payment = CartPayment::create([
            'cart_id'           => $cart->id,
            'payment_method_id' => $method->id,
            'amount'            => $validated['amount'],
            'admin_fee'         => $adminFee,
            'reference_number'  => $validated['reference_number'] ?? null,
        ]);

        // Hitung total yang sudah dibayar vs total cart
        $cartTotal     = $this->calculateCartTotal($cart);
        $totalPaid     = CartPayment::where('cart_id', $cart->id)->sum(\DB::raw('amount + admin_fee'));
        $remainingDue  = max(0, $cartTotal - $totalPaid);
        $changeAmount  = max(0, $totalPaid - $cartTotal);

        return response()->json([
            'message'       => 'Payment berhasil ditambahkan.',
            'payment'       => [
                'id'               => $payment->id,
                'method_name'      => $method->name,
                'method_type'      => $method->type,
                'amount'           => $payment->amount,
                'admin_fee'        => $payment->admin_fee,
                'total'            => $payment->amount + $payment->admin_fee,
                'reference_number' => $payment->reference_number,
            ],
            'summary' => [
                'cart_total'    => $cartTotal,
                'total_paid'    => $totalPaid,
                'remaining_due' => $remainingDue,
                'change_amount' => $changeAmount,
                'is_sufficient' => $totalPaid >= $cartTotal,
            ],
        ]);
    }

    /**
     * DELETE /pos/cart/{cart}/payments/{payment}
     *
     * Hapus payment dari buffer.
     */
    public function removePayment(Request $request, Cart $cart, CartPayment $payment): JsonResponse
    {
        $this->authorizeCart($cart, $request);

        if ($payment->cart_id !== $cart->id) {
            return response()->json(['message' => 'Payment tidak ditemukan di cart ini.'], 404);
        }

        $payment->delete();

        return response()->json(['message' => 'Payment berhasil dihapus dari cart.']);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private function authorizeCart(Cart $cart, Request $request): void
    {
        $store = $request->attributes->get('active_store');

        abort_if(
            $cart->cashier_id !== $request->user()->id || $cart->store_id !== $store->id,
            403,
            'Cart tidak ditemukan atau tidak memiliki akses.'
        );
    }

    private function calculateCartTotal(Cart $cart): float
    {
        $perfumeSubtotal  = $cart->unit_price * $cart->qty;

        $packagingSubtotal = CartPackaging::where('cart_id', $cart->id)
            ->sum(DB::raw('qty * unit_price'));

        $discountTotal = \App\Models\CartDiscount::where('cart_id', $cart->id)
            ->sum('applied_amount');

        return max(0, $perfumeSubtotal + $packagingSubtotal - $discountTotal);
    }

    private function formatCart(Cart $cart): array
    {
        return [
            'id'              => $cart->id,
            'variant'         => $cart->variant?->only('id', 'name', 'code'),
            'intensity'       => $cart->intensity?->only('id', 'name', 'code'),
            'size'            => $cart->size ? ['id' => $cart->size->id, 'name' => $cart->size->name, 'volume_ml' => $cart->size->volume_ml] : null,
            'qty'             => $cart->qty,
            'unit_price'      => $cart->unit_price,
            'price_formatted' => 'Rp ' . number_format($cart->unit_price, 0, ',', '.'),
            'subtotal'        => $cart->unit_price * $cart->qty,
            'customer'        => $cart->customer?->only('id', 'name', 'phone', 'tier', 'points'),
            'sales_person'    => $cart->salesPerson?->only('id', 'name', 'code'),
            'is_held'         => (bool) $cart->hold_id,
            'hold_label'      => $cart->hold_label,
            'held_at'         => $cart->held_at,
            'expires_at'      => $cart->cart_expires_at,
            'created_at'      => $cart->created_at,
        ];
    }

    private function formatCartDetail(Cart $cart): array
    {
        $perfumeSubtotal  = $cart->unit_price * $cart->qty;

        $packagingItems = $cart->cartPackagings->map(fn ($cp) => [
            'id'              => $cp->id,
            'packaging_id'    => $cp->packaging_material_id,
            'name'            => $cp->packagingMaterial?->name,
            'code'            => $cp->packagingMaterial?->code,
            'qty'             => $cp->qty,
            'unit_price'      => $cp->unit_price,
            'subtotal'        => $cp->qty * $cp->unit_price,
            'price_formatted' => 'Rp ' . number_format($cp->unit_price, 0, ',', '.'),
        ]);

        $packagingSubtotal = $packagingItems->sum('subtotal');

        $discountItems = $cart->cartDiscounts->map(fn ($cd) => [
            'id'             => $cd->id,
            'discount_id'    => $cd->discount_type_id,
            'discount_name'  => $cd->discountType?->name,
            'discount_type'  => $cd->discountType?->type,
            'applied_amount' => $cd->applied_amount,
        ]);

        $discountTotal = $discountItems->sum('applied_amount');

        $paymentItems = $cart->cartPayments->map(fn ($cp) => [
            'id'               => $cp->id,
            'method_id'        => $cp->payment_method_id,
            'method_name'      => $cp->paymentMethod?->name,
            'method_type'      => $cp->paymentMethod?->type,
            'amount'           => $cp->amount,
            'admin_fee'        => $cp->admin_fee,
            'total'            => $cp->amount + $cp->admin_fee,
            'reference_number' => $cp->reference_number,
        ]);

        $totalPaid    = $paymentItems->sum('total');
        $grandTotal   = max(0, $perfumeSubtotal + $packagingSubtotal - $discountTotal);
        $changeAmount = max(0, $totalPaid - $grandTotal);

        return [
            'id'           => $cart->id,
            'product'      => $cart->product ? $cart->product->only('id', 'sku', 'name') : null,
            'variant'      => $cart->variant?->only('id', 'name', 'code', 'image'),
            'intensity'    => $cart->intensity?->only('id', 'name', 'code'),
            'size'         => $cart->size ? ['id' => $cart->size->id, 'name' => $cart->size->name, 'volume_ml' => $cart->size->volume_ml] : null,
            'qty'          => $cart->qty,
            'unit_price'   => $cart->unit_price,
            'customer'     => $cart->customer?->only('id', 'name', 'phone', 'tier', 'points'),
            'sales_person' => $cart->salesPerson?->only('id', 'name', 'code'),
            'is_held'      => (bool) $cart->hold_id,
            'hold_label'   => $cart->hold_label,
            'packaging'    => $packagingItems,
            'discounts'    => $discountItems,
            'payments'     => $paymentItems,
            'summary' => [
                'perfume_subtotal'   => $perfumeSubtotal,
                'packaging_subtotal' => $packagingSubtotal,
                'subtotal'           => $perfumeSubtotal + $packagingSubtotal,
                'discount_total'     => $discountTotal,
                'grand_total'        => $grandTotal,
                'total_paid'         => $totalPaid,
                'change_amount'      => $changeAmount,
                'remaining_due'      => max(0, $grandTotal - $totalPaid),
                'is_sufficient'      => $totalPaid >= $grandTotal,
            ],
        ];
    }
}
