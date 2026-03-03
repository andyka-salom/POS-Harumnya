<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Http\Requests\POS\AddToCartRequest;
use App\Http\Requests\POS\CheckoutRequest;
use App\Http\Requests\POS\StoreCustomerRequest;
use App\Models\Cart;
use App\Models\CartPackaging;
use App\Models\Customer;
use App\Models\CustomerPointLedger;
use App\Models\DiscountType;
use App\Models\DiscountUsage;
use App\Models\Intensity;
use App\Models\IntensitySizePrice;
use App\Models\PackagingMaterial;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleDiscount;
use App\Models\SaleItem;
use App\Models\SaleItemPackaging;
use App\Models\SalePayment;
use App\Models\SalesPerson;
use App\Models\Size;
use App\Models\Store;
use App\Models\Variant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class POSController extends Controller
{
    // =========================================================================
    // INDEX — Halaman utama POS
    // GET /dashboard/transactions
    // =========================================================================

    public function index(): Response
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;

        if (! $storeId) {
            return Inertia::render('Dashboard/Transactions/Index', [
                'error'              => 'Anda belum memiliki toko default. Hubungi admin.',
                'carts'              => [],
                'carts_total'        => 0,
                'heldCarts'          => [],
                'variants'           => [],
                'customers'          => [],
                'salesPeople'        => [],
                'packagingMaterials' => [],
                'paymentMethods'     => [],
                'discounts'          => [],
                'storeId'            => null,
                'storeName'          => null,
            ]);
        }

        $store = Store::with('storeCategory')->find($storeId);

        $carts      = $this->getActiveCarts($user->id, $storeId);
        $cartsTotal = $this->calcCartsTotal($carts);
        $heldCarts  = $this->getHeldCarts($user->id, $storeId);

        $customers = Customer::select('id', 'name', 'phone', 'code', 'tier', 'points')
            ->where('is_active', true)
            ->orderBy('name')
            ->limit(100)
            ->get();

        $salesPeople = SalesPerson::select('id', 'name', 'code', 'phone')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $packagingMaterials = PackagingMaterial::select('id', 'name', 'code', 'selling_price')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $paymentMethods = PaymentMethod::select(
            'id', 'name', 'code', 'type', 'admin_fee_pct', 'can_give_change'
        )
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $discounts = $this->getActiveDiscountsForStore($storeId);

        return Inertia::render('Dashboard/Transactions/Index', [
            'carts'              => $carts,
            'carts_total'        => $cartsTotal,
            'heldCarts'          => $heldCarts,
            'variants'           => $this->getVariantsForStore($store),
            'customers'          => $customers,
            'salesPeople'        => $salesPeople,
            'packagingMaterials' => $packagingMaterials,
            'paymentMethods'     => $paymentMethods,
            'discounts'          => $discounts,
            'storeId'            => $storeId,
            'storeName'          => $store?->name,
            'error'              => null,
        ]);
    }

    // =========================================================================
    // GET INTENSITIES
    // GET /dashboard/transactions/get-intensities?variant_id=X
    // =========================================================================

    public function getIntensities(Request $request): JsonResponse
    {
        $request->validate(['variant_id' => 'required|uuid|exists:variants,id']);

        $intensities = Intensity::whereHas('products', fn ($q) =>
                $q->where('variant_id', $request->variant_id)->where('is_active', true)
            )
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'oil_ratio', 'alcohol_ratio', 'concentration_percentage', 'sort_order']);

        return response()->json(['success' => true, 'data' => $intensities]);
    }

    // =========================================================================
    // GET SIZES
    // GET /dashboard/transactions/get-sizes?variant_id=X&intensity_id=Y
    // =========================================================================

    public function getSizes(Request $request): JsonResponse
    {
        $request->validate([
            'variant_id'   => 'required|uuid|exists:variants,id',
            'intensity_id' => 'required|uuid|exists:intensities,id',
        ]);

        $sizes = Size::whereHas('products', fn ($q) =>
                $q->where('variant_id', $request->variant_id)
                  ->where('intensity_id', $request->intensity_id)
                  ->where('is_active', true)
            )
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'volume_ml', 'sort_order'])
            ->map(function ($size) use ($request) {
                $size->price = IntensitySizePrice::where('intensity_id', $request->intensity_id)
                    ->where('size_id', $size->id)
                    ->where('is_active', true)
                    ->value('price');
                return $size;
            });

        return response()->json(['success' => true, 'data' => $sizes]);
    }

    // =========================================================================
    // GET PERFUME PRICE
    // POST /dashboard/transactions/get-perfume-price
    // Body: variant_id, intensity_id, size_id, packaging_ids[]
    // =========================================================================

    public function getPerfumePrice(Request $request): JsonResponse
    {
        $request->validate([
            'variant_id'      => 'required|uuid|exists:variants,id',
            'intensity_id'    => 'required|uuid|exists:intensities,id',
            'size_id'         => 'required|uuid|exists:sizes,id',
            'packaging_ids'   => 'nullable|array',
            'packaging_ids.*' => 'uuid|exists:packaging_materials,id',
        ]);

        $product = Product::where('variant_id', $request->variant_id)
            ->where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->first();

        if (! $product) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak tersedia untuk kombinasi ini',
            ], 404);
        }

        $perfumePrice = IntensitySizePrice::where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->value('price') ?? $product->selling_price;

        $packagingTotal   = 0;
        $packagingDetails = [];

        if ($request->filled('packaging_ids')) {
            PackagingMaterial::whereIn('id', $request->packaging_ids)
                ->where('is_active', true)
                ->get(['id', 'name', 'selling_price'])
                ->each(function ($pkg) use (&$packagingTotal, &$packagingDetails) {
                    $packagingTotal      += $pkg->selling_price ?? 0;
                    $packagingDetails[]   = [
                        'id'    => $pkg->id,
                        'name'  => $pkg->name,
                        'price' => $pkg->selling_price,
                    ];
                });
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'product_id'       => $product->id,
                'product_name'     => $product->name,
                'product_sku'      => $product->sku,
                'perfume_price'    => $perfumePrice,
                'packaging_total'  => $packagingTotal,
                'packaging_detail' => $packagingDetails,
                'total_price'      => $perfumePrice + $packagingTotal,
                'stock_available'  => true,
            ],
        ]);
    }

    // =========================================================================
    // ADD TO CART
    // POST /dashboard/transactions/add-to-cart
    // Mendukung packaging_ids[] multi-select (bisa lebih dari 1)
    // =========================================================================

    public function addToCart(AddToCartRequest $request): RedirectResponse
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;

        abort_unless($storeId, 422, 'Toko default tidak ditemukan');

        $product = Product::where('variant_id', $request->variant_id)
            ->where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->first();

        $price = IntensitySizePrice::where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->value('price') ?? ($product?->selling_price ?? 0);

        DB::transaction(function () use ($request, $user, $storeId, $product, $price) {
            $cart = Cart::create([
                'cashier_id'   => $user->id,
                'store_id'     => $storeId,
                'variant_id'   => $request->variant_id,
                'intensity_id' => $request->intensity_id,
                'size_id'      => $request->size_id,
                'product_id'   => $product?->id,
                'unit_price'   => $price,
                'qty'          => $request->qty,
            ]);

            if ($request->filled('packaging_ids')) {
                $pkgs = PackagingMaterial::whereIn('id', $request->packaging_ids)
                    ->where('is_active', true)
                    ->get();

                foreach ($pkgs as $pkg) {
                    CartPackaging::create([
                        'cart_id'               => $cart->id,
                        'packaging_material_id' => $pkg->id,
                        'qty'                   => 1,
                        'unit_price'            => $pkg->selling_price ?? 0,
                    ]);
                }
            }
        });

        return back()->only('carts', 'carts_total');
    }

    // =========================================================================
    // UPDATE QTY CART ITEM
    // PATCH /dashboard/transactions/cart/{id}
    // =========================================================================

    public function updateCart(Request $request, string $id): RedirectResponse
    {
        $request->validate(['qty' => 'required|integer|min:1|max:99']);

        Cart::where('id', $id)
            ->where('cashier_id', Auth::id())
            ->whereNull('hold_id')
            ->update(['qty' => $request->qty]);

        return back()->only('carts', 'carts_total');
    }

    // =========================================================================
    // HAPUS CART ITEM
    // DELETE /dashboard/transactions/cart/{id}
    // =========================================================================

    public function destroyCart(string $id): RedirectResponse
    {
        Cart::where('id', $id)
            ->where('cashier_id', Auth::id())
            ->delete();

        return back()->only('carts', 'carts_total');
    }

    // =========================================================================
    // ADD PACKAGING KE CART ITEM EXISTING
    // POST /dashboard/transactions/cart/{cartId}/add-packaging
    // =========================================================================

    public function addPackaging(Request $request, string $cartId): RedirectResponse
    {
        $request->validate([
            'packaging_material_id' => 'required|uuid|exists:packaging_materials,id',
            'qty'                   => 'integer|min:1|max:20',
        ]);

        $cart = Cart::where('id', $cartId)
            ->where('cashier_id', Auth::id())
            ->whereNull('hold_id')
            ->firstOrFail();

        $pkg = PackagingMaterial::findOrFail($request->packaging_material_id);

        // uq_cart_packaging: unique per (cart_id, packaging_material_id)
        $existing = CartPackaging::where('cart_id', $cart->id)
            ->where('packaging_material_id', $request->packaging_material_id)
            ->first();

        if ($existing) {
            $existing->increment('qty', $request->qty ?? 1);
        } else {
            CartPackaging::create([
                'cart_id'               => $cart->id,
                'packaging_material_id' => $request->packaging_material_id,
                'qty'                   => $request->qty ?? 1,
                'unit_price'            => $pkg->selling_price ?? 0,
            ]);
        }

        return back()->only('carts', 'carts_total');
    }

    // =========================================================================
    // HAPUS PACKAGING DARI CART ITEM
    // DELETE /dashboard/transactions/cart-packaging/{id}
    // =========================================================================

    public function removePackaging(string $id): RedirectResponse
    {
        CartPackaging::whereHas('cart', fn ($q) => $q->where('cashier_id', Auth::id()))
            ->findOrFail($id)
            ->delete();

        return back()->only('carts', 'carts_total');
    }

    // =========================================================================
    // HOLD CART
    // POST /dashboard/transactions/hold
    // =========================================================================

    public function holdCart(Request $request): RedirectResponse
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;
        $holdId  = (string) Str::uuid();

        Cart::where('cashier_id', $user->id)
            ->where('store_id', $storeId)
            ->whereNull('hold_id')
            ->update([
                'hold_id'         => $holdId,
                'hold_label'      => $request->label ?? 'Hold ' . now()->format('H:i'),
                'held_at'         => now(),
                'cart_expires_at' => now()->addHours(2),
            ]);

        return back()->only('carts', 'carts_total', 'heldCarts');
    }

    // =========================================================================
    // RESUME HELD CART
    // POST /dashboard/transactions/resume/{holdId}
    // =========================================================================

    public function resumeCart(string $holdId): RedirectResponse
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;

        DB::transaction(function () use ($user, $storeId, $holdId) {
            // Parkir cart aktif saat ini terlebih dahulu
            if (Cart::where('cashier_id', $user->id)->where('store_id', $storeId)->whereNull('hold_id')->exists()) {
                Cart::where('cashier_id', $user->id)->where('store_id', $storeId)->whereNull('hold_id')
                    ->update([
                        'hold_id'         => (string) Str::uuid(),
                        'hold_label'      => 'Hold ' . now()->format('H:i'),
                        'held_at'         => now(),
                        'cart_expires_at' => now()->addHours(2),
                    ]);
            }

            // Aktifkan held cart yang dipilih
            Cart::where('cashier_id', $user->id)
                ->where('store_id', $storeId)
                ->where('hold_id', $holdId)
                ->update([
                    'hold_id'         => null,
                    'hold_label'      => null,
                    'held_at'         => null,
                    'cart_expires_at' => null,
                ]);
        });

        return back()->only('carts', 'carts_total', 'heldCarts');
    }

    // =========================================================================
    // HAPUS HELD CART
    // DELETE /dashboard/transactions/held/{holdId}
    // =========================================================================

    public function deleteHeld(string $holdId): RedirectResponse
    {
        Cart::where('cashier_id', Auth::id())
            ->where('hold_id', $holdId)
            ->delete();

        return back()->only('carts', 'carts_total', 'heldCarts');
    }

    // =========================================================================
    // CHECKOUT / STORE SALE
    // POST /dashboard/transactions/store
    // =========================================================================

    public function store(CheckoutRequest $request): RedirectResponse
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;

        $carts = Cart::with([
                'packagings.packagingMaterial',
                'product',
                'variant:id,name,code',
                'intensity:id,name,code',
                'size:id,name,volume_ml',
            ])
            ->where('cashier_id', $user->id)
            ->where('store_id', $storeId)
            ->whereNull('hold_id')
            ->get();

        if ($carts->isEmpty()) {
            return back()->withErrors(['message' => 'Keranjang kosong']);
        }

        $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);
        $customer      = $request->customer_id ? Customer::find($request->customer_id) : null;
        $salesPerson   = $request->sales_person_id ? SalesPerson::find($request->sales_person_id) : null;
        $discountType  = $request->discount_type_id ? DiscountType::find($request->discount_type_id) : null;

        // Standalone packagings dari tab Kemasan
        $standalonePkgs = [];
        if ($request->filled('standalone_packagings')) {
            foreach ($request->standalone_packagings as $sp) {
                $pkg = PackagingMaterial::find($sp['packaging_material_id'] ?? null);
                if ($pkg) {
                    $standalonePkgs[] = ['pkg' => $pkg, 'qty' => (int) ($sp['qty'] ?? 1)];
                }
            }
        }

        DB::transaction(function () use (
            $carts, $standalonePkgs, $request, $user, $storeId,
            $paymentMethod, $customer, $salesPerson, $discountType
        ) {
            [$subtotalPerfume, $subtotalPackaging, $cogsPerfume, $cogsPackaging]
                = $this->calcSubtotals($carts, $standalonePkgs);

            $subtotal       = $subtotalPerfume + $subtotalPackaging;
            $discountAmount = min((float) ($request->discount_amount ?? 0), $subtotal);
            $total          = max(0, $subtotal - $discountAmount);

            $isCash     = $paymentMethod->can_give_change || $paymentMethod->type === 'cash';
            $amountPaid = $isCash ? (float) ($request->cash_amount ?? $total) : $total;
            $adminFee   = (int) round($amountPaid * ($paymentMethod->admin_fee_pct ?? 0) / 100);
            $change     = $isCash ? max(0, $amountPaid - $total) : 0;
            $cogsTotal  = $cogsPerfume + $cogsPackaging;
            $grossProfit = $total - $cogsTotal;
            $marginPct   = $total > 0 ? round($grossProfit / $total * 100, 2) : 0;

            // ── Sale header ────────────────────────────────────────────────────
            $sale = Sale::create([
                'sale_number'        => $this->generateSaleNumber($storeId),
                'store_id'           => $storeId,
                'cashier_id'         => $user->id,
                'cashier_name'       => $user->name,
                'sales_person_id'    => $salesPerson?->id,
                'sales_person_name'  => $salesPerson?->name,
                'customer_id'        => $customer?->id,
                'customer_name'      => $customer?->name,
                'sold_at'            => now(),
                'subtotal_perfume'   => $subtotalPerfume,
                'subtotal_packaging' => $subtotalPackaging,
                'subtotal'           => $subtotal,
                'discount_amount'    => $discountAmount,
                'tax_amount'         => 0,
                'total'              => $total,
                'amount_paid'        => (int) $amountPaid,
                'change_amount'      => (int) $change,
                'cogs_perfume'       => $cogsPerfume,
                'cogs_packaging'     => $cogsPackaging,
                'cogs_total'         => $cogsTotal,
                'gross_profit'       => $grossProfit,
                'gross_margin_pct'   => $marginPct,
                'points_earned'      => 0,
                'points_redeemed'    => 0,
                'status'             => 'completed',
            ]);

            // ── Sale items dari cart ───────────────────────────────────────────
            foreach ($carts as $cart) {
                $itemSub    = $cart->unit_price * $cart->qty;
                $itemCogs   = ($cart->product?->production_cost ?? 0) * $cart->qty;
                $itemProfit = $itemSub - $itemCogs;

                $saleItem = SaleItem::create([
                    'sale_id'               => $sale->id,
                    'product_id'            => $cart->product_id,
                    'product_name'          => $this->buildProductName($cart),
                    'product_sku'           => $cart->product?->sku,
                    'variant_name'          => $cart->variant?->name,
                    'intensity_code'        => $cart->intensity?->code,
                    'size_ml'               => $cart->size?->volume_ml,
                    'qty'                   => $cart->qty,
                    'unit_price'            => $cart->unit_price,
                    'item_discount'         => 0,
                    'subtotal'              => $itemSub,
                    'cogs_per_unit'         => $cart->product?->production_cost ?? 0,
                    'cogs_total'            => $itemCogs,
                    'line_gross_profit'     => $itemProfit,
                    'line_gross_margin_pct' => $itemSub > 0 ? round($itemProfit / $itemSub * 100, 2) : 0,
                ]);

                foreach ($cart->packagings as $cartPkg) {
                    $this->createSaleItemPackaging($saleItem->id, $cartPkg);
                }
            }

            // ── Standalone packagings sebagai sale items terpisah ──────────────
            foreach ($standalonePkgs as $sp) {
                $pkg     = $sp['pkg'];
                $qty     = $sp['qty'];
                $pkgSub  = ($pkg->selling_price ?? 0) * $qty;
                $pkgCogs = ($pkg->average_cost ?? 0) * $qty;

                SaleItem::create([
                    'sale_id'               => $sale->id,
                    'product_id'            => null,
                    'product_name'          => '[Kemasan] ' . $pkg->name,
                    'product_sku'           => $pkg->code,
                    'variant_name'          => null,
                    'intensity_code'        => null,
                    'size_ml'               => null,
                    'qty'                   => $qty,
                    'unit_price'            => $pkg->selling_price ?? 0,
                    'item_discount'         => 0,
                    'subtotal'              => $pkgSub,
                    'cogs_per_unit'         => $pkg->average_cost ?? 0,
                    'cogs_total'            => $pkgCogs,
                    'line_gross_profit'     => $pkgSub - $pkgCogs,
                    'line_gross_margin_pct' => $pkgSub > 0
                        ? round(($pkgSub - $pkgCogs) / $pkgSub * 100, 2) : 0,
                    'notes'                 => 'Kemasan standalone',
                ]);
            }

            // ── Sale discount ──────────────────────────────────────────────────
            if ($discountAmount > 0) {
                SaleDiscount::create([
                    'sale_id'           => $sale->id,
                    'discount_type_id'  => $discountType?->id,
                    'discount_name'     => $discountType?->name ?? 'Diskon Manual',
                    'discount_category' => $discountType?->type ?? 'manual',
                    'discount_value'    => $discountType?->value ?? 0,
                    'applied_amount'    => (int) $discountAmount,
                    'sort_order'        => 1,
                ]);

                if ($discountType) {
                    DiscountUsage::create([
                        'discount_type_id' => $discountType->id,
                        'user_id'          => $user->id,
                        'order_id'         => $sale->id,
                        'amount_saved'     => (int) $discountAmount,
                        'used_at'          => now(),
                    ]);
                }
            }

            // ── Sale payment ───────────────────────────────────────────────────
            SalePayment::create([
                'sale_id'             => $sale->id,
                'payment_method_id'   => $paymentMethod->id,
                'amount'              => (int) $amountPaid,
                'admin_fee'           => $adminFee,
                'payment_method_name' => $paymentMethod->name,
                'payment_method_type' => $paymentMethod->type,
                'reference_number'    => $request->reference_number,
                'payment_status'      => 'completed',
                'settled_at'          => now(),
            ]);

            // ── Loyalty points ─────────────────────────────────────────────────
            if ($customer && $total > 0) {
                $pointsEarned = (int) floor($total / 10000);

                if ($pointsEarned > 0) {
                    $sale->update(['points_earned' => $pointsEarned]);
                    $customer->increment('points', $pointsEarned);
                    $customer->increment('lifetime_points_earned', $pointsEarned);
                    $customer->increment('lifetime_spending', (int) $total);
                    $customer->increment('total_transactions');

                    CustomerPointLedger::create([
                        'customer_id'    => $customer->id,
                        'type'           => 'earned',
                        'points'         => $pointsEarned,
                        'reference_type' => Sale::class,
                        'reference_id'   => $sale->id,
                        'notes'          => "Pembelian {$sale->sale_number}",
                    ]);
                }
            }

            // ── Bersihkan cart ─────────────────────────────────────────────────
            Cart::where('cashier_id', $user->id)
                ->where('store_id', $storeId)
                ->whereNull('hold_id')
                ->delete();
        });

        return redirect()->route('transactions.index')
            ->with('success', 'Transaksi berhasil disimpan!');
    }

    // =========================================================================
    // STORE CUSTOMER BARU (Quick add dari POS, AJAX)
    // POST /dashboard/transactions/customers
    // =========================================================================

    public function storeCustomer(StoreCustomerRequest $request): JsonResponse
    {
        $customer = Customer::create([
            'code'          => $this->generateCustomerCode(),
            'name'          => $request->name,
            'phone'         => $request->phone,
            'email'         => $request->email,
            'birth_date'    => $request->birth_date,
            'gender'        => $request->gender,
            'tier'          => 'bronze',
            'points'        => 0,
            'is_active'     => true,
            'registered_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pelanggan baru berhasil ditambahkan',
            'data'    => $customer->only('id', 'name', 'phone', 'code', 'tier', 'points'),
        ]);
    }

    // =========================================================================
    // SEARCH CUSTOMERS (AJAX live search)
    // GET /dashboard/transactions/search-customers?q=xxx
    // =========================================================================

    public function searchCustomers(Request $request): JsonResponse
    {
        $q = trim($request->get('q', ''));

        $customers = Customer::select('id', 'name', 'phone', 'code', 'tier', 'points')
            ->where('is_active', true)
            ->when($q, fn ($query) => $query->where(fn ($inner) =>
                $inner->where('name', 'like', "%{$q}%")
                      ->orWhere('phone', 'like', "%{$q}%")
                      ->orWhere('code', 'like', "%{$q}%")
            ))
            ->orderBy('name')
            ->limit(20)
            ->get();

        return response()->json(['success' => true, 'data' => $customers]);
    }

    // =========================================================================
    // CHECK ELIGIBLE DISCOUNTS (AJAX, dipanggil client setelah cart berubah)
    // POST /dashboard/transactions/check-discounts
    // Body: { cart_total, cart_quantity, cart_items[] }
    // =========================================================================

    public function checkDiscounts(Request $request): JsonResponse
    {
        $request->validate([
            'cart_total'    => 'required|numeric|min:0',
            'cart_quantity' => 'required|integer|min:0',
            'cart_items'    => 'nullable|array',
        ]);

        $storeId  = Auth::user()->default_store_id;
        $eligible = $this->getActiveDiscountsForStore($storeId)
            ->filter(function ($d) use ($request) {
                if ($d->min_purchase_amount && $request->cart_total < $d->min_purchase_amount) {
                    return false;
                }
                if ($d->min_purchase_quantity && $request->cart_quantity < $d->min_purchase_quantity) {
                    return false;
                }
                if ($d->requirements->isNotEmpty() && $request->filled('cart_items')) {
                    return $this->checkRequirements($d->requirements, $request->cart_items);
                }
                return true;
            })
            ->values();

        return response()->json(['success' => true, 'eligible' => $eligible]);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private function getActiveCarts(int $cashierId, string $storeId): Collection
    {
        return Cart::with([
                'variant:id,name,code,image',
                'intensity:id,name,code',
                'size:id,name,volume_ml',
                'packagings.packagingMaterial:id,name,code,selling_price',
            ])
            ->where('cashier_id', $cashierId)
            ->where('store_id', $storeId)
            ->whereNull('hold_id')
            ->latest()
            ->get();
    }

    private function calcCartsTotal(Collection $carts): int
    {
        return (int) $carts->sum(function ($cart) {
            $pkgTotal = $cart->packagings->sum(fn ($p) => ($p->unit_price ?? 0) * ($p->qty ?? 1));
            return ($cart->unit_price ?? 0) * $cart->qty + $pkgTotal;
        });
    }

    private function getHeldCarts(int $cashierId, string $storeId): Collection
    {
        return Cart::where('cashier_id', $cashierId)
            ->where('store_id', $storeId)
            ->whereNotNull('hold_id')
            ->select('hold_id', 'hold_label', 'held_at')
            ->selectRaw('SUM(unit_price * qty) as total')
            ->groupBy('hold_id', 'hold_label', 'held_at')
            ->get()
            ->map(fn ($h) => [
                'hold_id' => $h->hold_id,
                'label'   => $h->hold_label,
                'total'   => (int) $h->total,
                'held_at' => $h->held_at,
            ]);
    }

    /**
     * Filter variants berdasarkan store_category whitelist (migration 011).
     * Fallback ke semua variants jika:
     *   - Store tidak punya store_category_id
     *   - allow_all_variants = true
     *   - Whitelist kosong
     */
    private function getVariantsForStore(?Store $store): Collection
    {
        $base = Variant::where('is_active', true)->orderBy('sort_order');

        if (! $store || ! $store->store_category_id) {
            return $base->get(['id', 'name', 'code', 'gender', 'image']);
        }

        $category = $store->storeCategory;

        if (! $category || $category->allow_all_variants) {
            return $base->get(['id', 'name', 'code', 'gender', 'image']);
        }

        $allowedIds = $category->variants()
            ->wherePivot('is_active', true)
            ->pluck('variants.id');

        if ($allowedIds->isEmpty()) {
            return $base->get(['id', 'name', 'code', 'gender', 'image']); // safety fallback
        }

        return $base->whereIn('id', $allowedIds)
            ->get(['id', 'name', 'code', 'gender', 'image']);
    }

    /**
     * Ambil discounts aktif untuk store:
     * - Tidak ada discount_stores row = berlaku semua store
     * - Ada row = hanya berlaku untuk store yang listed
     */
    private function getActiveDiscountsForStore(string $storeId): Collection
    {
        return DiscountType::where('is_active', true)
            ->where(fn ($q) => $q->whereNull('start_date')
                                 ->orWhereDate('start_date', '<=', today()))
            ->where(fn ($q) => $q->whereNull('end_date')
                                 ->orWhereDate('end_date', '>=', today()))
            ->where(fn ($q) => $q->whereDoesntHave('stores')
                                 ->orWhereHas('stores', fn ($sq) => $sq->where('store_id', $storeId)))
            ->with(['requirements', 'applicabilities'])
            ->orderByDesc('priority')
            ->get([
                'id', 'name', 'code', 'type', 'value', 'description',
                'min_purchase_amount', 'min_purchase_quantity',
                'max_discount_amount', 'buy_quantity', 'get_quantity',
                'get_product_type', 'is_game_reward', 'is_combinable', 'priority',
            ]);
    }

    /**
     * Cek requirements diskon. Group logic: same group_key = OR, antar group = AND.
     */
    private function checkRequirements($requirements, array $cartItems): bool
    {
        $groups = $requirements->groupBy(fn ($r) => $r->group_key ?? 'grp_' . $r->id);

        foreach ($groups as $group) {
            $groupMet = false;
            foreach ($group as $req) {
                $matchQty = collect($cartItems)->filter(function ($item) use ($req) {
                    if ($req->size_id      && ($item['size_id']      ?? null) !== $req->size_id)      return false;
                    if ($req->intensity_id && ($item['intensity_id'] ?? null) !== $req->intensity_id) return false;
                    if ($req->variant_id   && ($item['variant_id']   ?? null) !== $req->variant_id)   return false;
                    return true;
                })->sum('qty');

                if ($matchQty >= ($req->required_quantity ?? 1)) {
                    $groupMet = true;
                    break;
                }
            }
            if (! $groupMet) return false;
        }
        return true;
    }

    /**
     * Hitung subtotals: [perfume, packaging, cogsPerfume, cogsPackaging]
     */
    private function calcSubtotals(Collection $carts, array $standalonePkgs): array
    {
        $sp = $sc = $cp = $cc = 0;

        foreach ($carts as $cart) {
            $sp += $cart->unit_price * $cart->qty;
            $cp += ($cart->product?->production_cost ?? 0) * $cart->qty;
            foreach ($cart->packagings as $pkg) {
                $sc += $pkg->unit_price * $pkg->qty;
                $cc += ($pkg->packagingMaterial?->average_cost ?? 0) * $pkg->qty;
            }
        }
        foreach ($standalonePkgs as $s) {
            $sc += ($s['pkg']->selling_price ?? 0) * $s['qty'];
            $cc += ($s['pkg']->average_cost  ?? 0) * $s['qty'];
        }

        return [(int) $sp, (int) $sc, (int) $cp, (int) $cc];
    }

    private function createSaleItemPackaging(string $saleItemId, $cartPkg): void
    {
        $sub  = $cartPkg->unit_price * $cartPkg->qty;
        $cogs = ($cartPkg->packagingMaterial?->average_cost ?? 0) * $cartPkg->qty;

        SaleItemPackaging::create([
            'sale_item_id'          => $saleItemId,
            'packaging_material_id' => $cartPkg->packaging_material_id,
            'packaging_name'        => $cartPkg->packagingMaterial?->name ?? 'Packaging',
            'packaging_code'        => $cartPkg->packagingMaterial?->code,
            'qty'                   => $cartPkg->qty,
            'unit_price'            => $cartPkg->unit_price,
            'subtotal'              => $sub,
            'unit_cost'             => $cartPkg->packagingMaterial?->average_cost ?? 0,
            'cogs_total'            => $cogs,
            'line_gross_profit'     => $sub - $cogs,
            'line_gross_margin_pct' => $sub > 0 ? round(($sub - $cogs) / $sub * 100, 2) : 0,
        ]);
    }

    private function buildProductName($cart): string
    {
        if ($cart->product?->name) {
            return $cart->product->name;
        }
        return implode(' - ', array_filter([
            $cart->variant?->name,
            $cart->intensity?->code,
            $cart->size?->volume_ml ? $cart->size->volume_ml . 'ml' : null,
        ]));
    }

    private function generateSaleNumber(string $storeId): string
    {
        $prefix = 'INV/' . now()->format('Ymd') . '/';
        $last   = Sale::where('sale_number', 'like', $prefix . '%')
            ->lockForUpdate()
            ->orderByDesc('sale_number')
            ->value('sale_number');
        $seq    = $last ? ((int) substr($last, -5)) + 1 : 1;
        return $prefix . str_pad($seq, 5, '0', STR_PAD_LEFT);
    }

    private function generateCustomerCode(): string
    {
        do {
            $code = 'CUST-' . strtoupper(Str::random(6));
        } while (Customer::where('code', $code)->exists());
        return $code;
    }
}
