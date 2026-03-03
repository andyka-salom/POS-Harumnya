<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
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
use App\Models\StoreCategory;
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

class TransactionController extends Controller
{
    // =========================================================================
    // INDEX — Halaman utama POS
    // GET /dashboard/transactions
    // Route name: transactions.index
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

        // Cart aktif kasir ini (hold_id IS NULL)
        $carts      = $this->getActiveCarts($user->id, $storeId);
        $cartsTotal = $this->calcCartsTotal($carts);
        $heldCarts  = $this->getHeldCarts($user->id, $storeId);

        // Customers — load initial 100, live search via filteredCustomers di frontend
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

        $paymentMethods = PaymentMethod::select('id', 'name', 'code', 'type', 'admin_fee_pct', 'can_give_change')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $discounts = $this->getActiveDiscountsForStore($storeId);
        $variants  = $this->getVariantsForStore($store);

        return Inertia::render('Dashboard/Transactions/Index', [
            'carts'              => $carts,
            'carts_total'        => $cartsTotal,
            'heldCarts'          => $heldCarts,
            'variants'           => $variants,
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
    // HISTORY — Riwayat transaksi
    // GET /dashboard/transactions/history
    // Route name: transactions.history
    // =========================================================================

    public function history(Request $request): Response
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;

        $query = Sale::with(['items', 'payments', 'discounts'])
            ->where('store_id', $storeId)
            ->latest('sold_at');

        // Filter tanggal
        if ($request->filled('date_from')) {
            $query->whereDate('sold_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('sold_at', '<=', $request->date_to);
        }
        // Filter cashier (jika bukan admin, hanya lihat transaksi sendiri)
        if (! $user->hasRole('super-admin') && ! $user->hasPermissionTo('transactions-all')) {
            $query->where('cashier_id', $user->id);
        }
        // Filter search (sale_number atau nama customer)
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(fn ($inner) =>
                $inner->where('sale_number', 'like', "%{$q}%")
                      ->orWhere('customer_name', 'like', "%{$q}%")
            );
        }

        $sales = $query->paginate(20)->withQueryString();

        return Inertia::render('Dashboard/Transactions/History', [
            'sales'  => $sales,
            'filters' => $request->only('date_from', 'date_to', 'q'),
        ]);
    }

    // =========================================================================
    // PRINT — Struk/receipt penjualan
    // GET /dashboard/transactions/print/{saleNumber}
    // Route name: transactions.print
    // =========================================================================

    public function print(string $saleNumber): Response
    {
        $sale = Sale::with([
                'items.packagings',
                'payments.paymentMethod',
                'discounts',
                'store',
                'cashier',
                'salesPerson',
                'customer',
            ])
            ->where('sale_number', $saleNumber)
            ->firstOrFail();

        return Inertia::render('Dashboard/Transactions/Print', [
            'sale' => $sale,
        ]);
    }

    // =========================================================================
    // GET AVAILABLE INTENSITIES — Step 2: setelah variant dipilih
    // GET /dashboard/transactions/get-intensities?variant_id=X
    // Route name: transactions.get-intensities
    //
    // Strategi: coba dari products dulu, fallback ke intensity_size_prices,
    // fallback terakhir semua intensities aktif (jika sistem masih setup awal).
    // =========================================================================

    // =========================================================================
    // GET AVAILABLE INTENSITIES
    // GET /dashboard/transactions/get-intensities?variant_id=X
    // Route name: transactions.get-intensities
    //
    // Sumber kebenaran: intensity_size_prices
    // Intensitas yang valid = yang punya minimal 1 harga aktif di intensity_size_prices.
    // Ini benar untuk SEMUA varian (ada produk maupun belum).
    // =========================================================================

    public function getAvailableIntensities(Request $request): JsonResponse
    {
        $request->validate(['variant_id' => 'required|uuid|exists:variants,id']);

        // Intensitas yang punya harga di intensity_size_prices (aktif)
        $intensityIds = IntensitySizePrice::where('is_active', true)
            ->pluck('intensity_id')
            ->unique();

        if ($intensityIds->isEmpty()) {
            // Fallback: semua intensitas aktif (admin belum setup harga sama sekali)
            $intensities = Intensity::where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'code', 'oil_ratio', 'alcohol_ratio', 'concentration_percentage', 'sort_order']);
        } else {
            $intensities = Intensity::whereIn('id', $intensityIds)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'code', 'oil_ratio', 'alcohol_ratio', 'concentration_percentage', 'sort_order']);
        }

        return response()->json([
            'success' => true,
            'data'    => $intensities,
        ]);
    }

    // =========================================================================
    // GET AVAILABLE SIZES
    // GET /dashboard/transactions/get-sizes?variant_id=X&intensity_id=Y
    // Route name: transactions.get-sizes
    //
    // Sumber kebenaran: intensity_size_prices
    // Size valid = yang punya harga aktif di intensity_size_prices untuk intensity ini.
    // Ini konsisten untuk SEMUA varian.
    // =========================================================================

    public function getAvailableSizes(Request $request): JsonResponse
    {
        $request->validate([
            'variant_id'   => 'required|uuid|exists:variants,id',
            'intensity_id' => 'required|uuid|exists:intensities,id',
        ]);

        // Ambil semua size_id yang punya harga untuk intensity ini
        $priceRows = IntensitySizePrice::where('intensity_id', $request->intensity_id)
            ->where('is_active', true)
            ->get(['size_id', 'price']);

        if ($priceRows->isEmpty()) {
            // Tidak ada harga untuk intensity ini sama sekali
            return response()->json([
                'success' => true,
                'data'    => [],
            ]);
        }

        $priceMap = $priceRows->pluck('price', 'size_id');

        $sizes = Size::whereIn('id', $priceMap->keys())
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'volume_ml', 'sort_order'])
            ->map(function ($size) use ($priceMap) {
                $size->price = $priceMap->get($size->id);
                return $size;
            });

        return response()->json([
            'success' => true,
            'data'    => $sizes,
        ]);
    }

    // =========================================================================
    // GET PERFUME PRICE — Dipanggil saat builder bar muncul (+ packaging opsional)
    // POST /dashboard/transactions/get-perfume-price
    // Route name: transactions.get-perfume-price
    // Body: variant_id, intensity_id, size_id, packaging_ids[]
    //
    // PENTING: Sistem made-to-order — products table mungkin kosong.
    // Harga UTAMA dari intensity_size_prices. Product hanya opsional (nama/SKU).
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

        // ── 1. Harga dari intensity_size_prices (sumber kebenaran utama) ───────
        $perfumePrice = IntensitySizePrice::where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->value('price');

        // ── 2. Product opsional (untuk nama & SKU, bukan penentu harga) ────────
        $product = Product::where('variant_id', $request->variant_id)
            ->where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->first();

        // ── 3. Fallback harga ke products.selling_price jika isp belum di-set ──
        if ($perfumePrice === null && $product !== null) {
            $perfumePrice = $product->selling_price;
        }

        // ── 4. Tidak ada harga sama sekali → admin belum setup ─────────────────
        if ($perfumePrice === null) {
            return response()->json([
                'success' => false,
                'message' => 'Harga belum diatur untuk ukuran ini. Silakan hubungi admin.',
            ], 422);
        }

        // ── 5. Hitung packaging ────────────────────────────────────────────────
        $packagingTotal   = 0;
        $packagingDetails = [];

        if ($request->filled('packaging_ids')) {
            PackagingMaterial::whereIn('id', $request->packaging_ids)
                ->where('is_active', true)
                ->get(['id', 'name', 'selling_price'])
                ->each(function ($pkg) use (&$packagingTotal, &$packagingDetails) {
                    $packagingTotal    += (int) ($pkg->selling_price ?? 0);
                    $packagingDetails[] = [
                        'id'    => $pkg->id,
                        'name'  => $pkg->name,
                        'price' => $pkg->selling_price,
                    ];
                });
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'product_id'       => $product?->id,
                'product_name'     => $product?->name,
                'product_sku'      => $product?->sku,
                'perfume_price'    => (int) $perfumePrice,
                'packaging_total'  => $packagingTotal,
                'packaging_detail' => $packagingDetails,
                'total_price'      => (int) $perfumePrice + $packagingTotal,
                'stock_available'  => true,
            ],
        ]);
    }

    // =========================================================================
    // ADD TO CART
    // POST /dashboard/transactions/add-to-cart
    // Route name: transactions.add-to-cart
    // Mendukung packaging_ids[] multi-select (attached ke cart item)
    // =========================================================================

    public function addToCart(Request $request): RedirectResponse
    {
        $request->validate([
            'variant_id'      => 'required|uuid|exists:variants,id',
            'intensity_id'    => 'required|uuid|exists:intensities,id',
            'size_id'         => 'required|uuid|exists:sizes,id',
            'qty'             => 'required|integer|min:1|max:99',
            'packaging_ids'   => 'nullable|array',
            'packaging_ids.*' => 'uuid|exists:packaging_materials,id',
        ]);

        $user    = Auth::user();
        $storeId = $user->default_store_id;

        abort_unless($storeId, 422, 'Toko default tidak ditemukan. Hubungi admin.');

        // Product opsional (made-to-order: mungkin belum di-generate dari recipe)
        $product = Product::where('variant_id', $request->variant_id)
            ->where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->first();

        // Harga: intensity_size_prices (utama) → products.selling_price → 0
        // Cast ke (int) karena PostgreSQL kolom bigint tidak terima decimal string seperti "85000.00"
        $price = (int) (IntensitySizePrice::where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->value('price')
            ?? $product?->selling_price
            ?? 0);

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

            // Packaging add-ons yang melekat ke cart item ini
            if ($request->filled('packaging_ids')) {
                PackagingMaterial::whereIn('id', $request->packaging_ids)
                    ->where('is_active', true)
                    ->get()
                    ->each(function ($pkg) use ($cart) {
                        CartPackaging::create([
                            'cart_id'               => $cart->id,
                            'packaging_material_id' => $pkg->id,
                            'qty'                   => 1,
                            'unit_price'            => (int) ($pkg->selling_price ?? 0),
                        ]);
                    });
            }
        });

        return back();
    }

    // =========================================================================
    // UPDATE QTY CART ITEM
    // PATCH /dashboard/transactions/cart/{id}
    // Route name: transactions.update-cart
    // =========================================================================

    public function updateCart(Request $request, string $id): RedirectResponse
    {
        $request->validate(['qty' => 'required|integer|min:1|max:99']);

        Cart::where('id', $id)
            ->where('cashier_id', Auth::id())
            ->whereNull('hold_id')
            ->update(['qty' => $request->qty]);

        return back();
    }

    // =========================================================================
    // HAPUS CART ITEM
    // DELETE /dashboard/transactions/cart/{id}
    // Route name: transactions.destroy-cart
    // =========================================================================

    public function destroyCart(string $id): RedirectResponse
    {
        Cart::where('id', $id)
            ->where('cashier_id', Auth::id())
            ->delete();

        return back();
    }

    // =========================================================================
    // HOLD CART (Parkir transaksi)
    // POST /dashboard/transactions/hold
    // Route name: transactions.hold
    // =========================================================================

    public function holdCart(Request $request): RedirectResponse
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;

        Cart::where('cashier_id', $user->id)
            ->where('store_id', $storeId)
            ->whereNull('hold_id')
            ->update([
                'hold_id'         => (string) Str::uuid(),
                'hold_label'      => $request->label ?? 'Hold ' . now()->format('H:i'),
                'held_at'         => now(),
                'cart_expires_at' => now()->addHours(2),
            ]);

        return back();
    }

    // =========================================================================
    // RESUME HELD CART
    // POST /dashboard/transactions/resume/{holdId}
    // Route name: transactions.resume
    // Jika ada cart aktif → di-hold dulu otomatis, lalu held cart diaktifkan.
    // =========================================================================

    public function resumeHeldCart(string $holdId): RedirectResponse
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;

        DB::transaction(function () use ($user, $storeId, $holdId) {
            // Parkir cart aktif saat ini terlebih dahulu (jika ada)
            if (Cart::where('cashier_id', $user->id)
                    ->where('store_id', $storeId)
                    ->whereNull('hold_id')
                    ->exists()) {

                Cart::where('cashier_id', $user->id)
                    ->where('store_id', $storeId)
                    ->whereNull('hold_id')
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

        return back();
    }

    // =========================================================================
    // HAPUS HELD CART
    // DELETE /dashboard/transactions/held/{holdId}
    // Route name: transactions.delete-held
    // =========================================================================

    public function deleteHeldCart(string $holdId): RedirectResponse
    {
        Cart::where('cashier_id', Auth::id())
            ->where('hold_id', $holdId)
            ->delete();

        return back();
    }

    // =========================================================================
    // CHECKOUT / STORE SALE
    // POST /dashboard/transactions/store
    // Route name: transactions.store
    //
    // Payload dari Index.jsx:
    //   customer_id, sales_person_id, payment_method_id,
    //   discount_type_id, discount_amount, cash_amount,
    //   standalone_packagings[]{packaging_material_id, qty}
    // =========================================================================

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'payment_method_id'                             => 'required|uuid|exists:payment_methods,id',
            'customer_id'                                   => 'nullable|uuid|exists:customers,id',
            'sales_person_id'                               => 'nullable|uuid|exists:sales_people,id',
            'discount_type_id'                              => 'nullable|uuid|exists:discount_types,id',
            'discount_amount'                               => 'nullable|numeric|min:0',
            'cash_amount'                                   => 'nullable|numeric|min:0',
            'standalone_packagings'                         => 'nullable|array',
            'standalone_packagings.*.packaging_material_id' => 'required|uuid|exists:packaging_materials,id',
            'standalone_packagings.*.qty'                   => 'required|integer|min:1|max:99',
        ]);

        $user    = Auth::user();
        $storeId = $user->default_store_id;

        // Load cart aktif dengan semua relasi
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

        // Resolve standalone packagings (tab Kemasan, tidak terikat ke cart item)
        $standalonePkgs = [];
        foreach ((array) $request->standalone_packagings as $sp) {
            $pkg = PackagingMaterial::find($sp['packaging_material_id'] ?? null);
            if ($pkg) {
                $standalonePkgs[] = ['pkg' => $pkg, 'qty' => (int) ($sp['qty'] ?? 1)];
            }
        }

        DB::transaction(function () use (
            $carts, $standalonePkgs, $request, $user, $storeId,
            $paymentMethod, $customer, $salesPerson, $discountType
        ) {
            // ── Hitung subtotals ───────────────────────────────────────────────
            [$subtotalPerfume, $subtotalPackaging, $cogsPerfume, $cogsPackaging]
                = $this->calcSubtotals($carts, $standalonePkgs);

            $subtotal       = $subtotalPerfume + $subtotalPackaging;
            $discountAmount = min((float) ($request->discount_amount ?? 0), $subtotal);
            $total          = max(0, $subtotal - $discountAmount);

            // Perhitungan pembayaran
            $isCash     = $paymentMethod->can_give_change || $paymentMethod->type === 'cash';
            $amountPaid = $isCash ? (float) ($request->cash_amount ?? $total) : $total;
            $adminFee   = (int) round($amountPaid * ($paymentMethod->admin_fee_pct ?? 0) / 100);
            $change     = $isCash ? max(0, $amountPaid - $total) : 0;

            // Profitabilitas
            $cogsTotal   = $cogsPerfume + $cogsPackaging;
            $grossProfit = $total - $cogsTotal;
            $marginPct   = $total > 0 ? round($grossProfit / $total * 100, 2) : 0;

            // ── Buat Sale header ───────────────────────────────────────────────
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
                'discount_amount'    => (int) $discountAmount,
                'tax_amount'         => 0,
                'total'              => (int) $total,
                'amount_paid'        => (int) $amountPaid,
                'change_amount'      => (int) $change,
                'cogs_perfume'       => $cogsPerfume,
                'cogs_packaging'     => $cogsPackaging,
                'cogs_total'         => $cogsTotal,
                'gross_profit'       => (int) $grossProfit,
                'gross_margin_pct'   => $marginPct,
                'points_earned'      => 0,
                'points_redeemed'    => 0,
                'status'             => 'completed',
            ]);

            // ── Sale Items dari cart ───────────────────────────────────────────
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
                    'line_gross_margin_pct' => $itemSub > 0
                        ? round($itemProfit / $itemSub * 100, 2) : 0,
                ]);

                // Packaging attached ke item ini
                foreach ($cart->packagings as $cartPkg) {
                    $this->createSaleItemPackaging($saleItem->id, $cartPkg);
                }
            }

            // ── Standalone packagings (tab Kemasan) sebagai SaleItem terpisah ──
            foreach ($standalonePkgs as $sp) {
                $pkg    = $sp['pkg'];
                $qty    = $sp['qty'];
                $pkgSub  = (int) (($pkg->selling_price ?? 0) * $qty);
                $pkgCogs = (int) (($pkg->average_cost ?? 0) * $qty);

                SaleItem::create([
                    'sale_id'               => $sale->id,
                    'product_id'            => null,
                    'product_name'          => '[Kemasan] ' . $pkg->name,
                    'product_sku'           => $pkg->code,
                    'variant_name'          => null,
                    'intensity_code'        => null,
                    'size_ml'               => null,
                    'qty'                   => $qty,
                    'unit_price'            => (int) ($pkg->selling_price ?? 0),
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

            // ── Sale Discount ──────────────────────────────────────────────────
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

            // ── Sale Payment ───────────────────────────────────────────────────
            SalePayment::create([
                'sale_id'             => $sale->id,
                'payment_method_id'   => $paymentMethod->id,
                'amount'              => (int) $amountPaid,
                'admin_fee'           => $adminFee,
                'payment_method_name' => $paymentMethod->name,
                'payment_method_type' => $paymentMethod->type,
                'payment_status'      => 'completed',
                'settled_at'          => now(),
            ]);

            // ── Loyalty Points ─────────────────────────────────────────────────
            if ($customer && $total > 0) {
                $pointsEarned = (int) floor($total / 10000); // 1 poin per Rp10.000

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

            // ── Bersihkan cart aktif ───────────────────────────────────────────
            Cart::where('cashier_id', $user->id)
                ->where('store_id', $storeId)
                ->whereNull('hold_id')
                ->delete();
        });

        return redirect()->route('transactions.index')
            ->with('success', 'Transaksi berhasil disimpan!');
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Load cart aktif kasir dengan semua relasi yang dibutuhkan frontend.
     */
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

    /**
     * Hitung total semua cart items termasuk packaging mereka.
     */
    private function calcCartsTotal(Collection $carts): int
    {
        return (int) $carts->sum(function ($cart) {
            $pkgTotal = $cart->packagings->sum(
                fn ($p) => ($p->unit_price ?? 0) * ($p->qty ?? 1)
            );
            return ($cart->unit_price ?? 0) * $cart->qty + $pkgTotal;
        });
    }

    /**
     * Load held carts grouped by hold_id.
     */
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
     *
     * Logic:
     *   1. Store tanpa store_category_id        → semua variant
     *   2. store_category.allow_all_variants     → semua variant
     *   3. Whitelist kosong                      → semua variant (safety fallback)
     *   4. Ada whitelist aktif                   → hanya variant di whitelist
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
     * Ambil discounts aktif yang valid untuk store ini.
     *
     * Logika store scoping:
     *   - Tidak ada baris di discount_stores  → berlaku semua store
     *   - Ada baris di discount_stores        → hanya store yang terdaftar
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
     * Hitung subtotals dan COGS dari carts + standalone packagings.
     * @return array [subtotalPerfume, subtotalPackaging, cogsPerfume, cogsPackaging]
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

    /**
     * Buat record SaleItemPackaging dari CartPackaging.
     */
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
            'line_gross_margin_pct' => $sub > 0
                ? round(($sub - $cogs) / $sub * 100, 2) : 0,
        ]);
    }

    /**
     * Build nama produk dari relasi cart (fallback jika products.name kosong).
     */
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

    /**
     * Generate sale number aman dari race condition: INV/YYYYMMDD/XXXXX
     */
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
}
