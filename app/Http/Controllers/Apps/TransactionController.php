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
                'intensities'        => [],
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

        // ── PERUBAHAN: Load intensities di index, bukan variants ─────────────
        // Alur baru: Intensity → Variant → Size
        $intensities = Intensity::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'oil_ratio', 'alcohol_ratio', 'sort_order']);

        $customers = Customer::select('id', 'name', 'phone', 'code', 'tier', 'points')
            ->where('is_active', true)
            ->orderBy('name')
            ->limit(100)
            ->get();

        $salesPeople = SalesPerson::select('id', 'name', 'code', 'phone')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        // ── Packaging: sertakan is_free ────────────────────────────────────
        $packagingMaterials = PackagingMaterial::select(
                'id', 'name', 'code', 'selling_price', 'is_free',
                'free_condition_note', 'average_cost', 'sort_order'
            )
            ->where('is_active', true)
            ->where('is_available_as_addon', true)
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
            'intensities'        => $intensities,   // ← sebelumnya 'variants'
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
    // =========================================================================

    public function history(Request $request): Response
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;

        $query = Sale::with([
                'items',
                'payments.paymentMethod',
                'customer:id,name,phone',
                'cashier:id,name',
                'salesPerson:id,name,code',
            ])
            ->withCount('items')
            ->where('store_id', $storeId)
            ->latest('sold_at');

        // ── Filter tanggal — gunakan sold_at (bukan sale_date) ──────────────
        if ($request->filled('date_from')) {
            $query->whereDate('sold_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('sold_at', '<=', $request->date_to);
        }

        // ── Filter status ────────────────────────────────────────────────────
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // ── Akses control ────────────────────────────────────────────────────
        if (! $user->hasRole('super-admin') && ! $user->hasPermissionTo('transactions-all')) {
            $query->where('cashier_id', $user->id);
        }

        // ── Search: sale_number atau customer_name (snapshot) ────────────────
        if ($request->filled('sale_number')) {
            $q = $request->sale_number;
            $query->where('sale_number', 'like', "%{$q}%");
        }
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(fn ($inner) =>
                $inner->where('sale_number', 'like', "%{$q}%")
                      ->orWhere('customer_name', 'like', "%{$q}%")
            );
        }

        $sales = $query->paginate(20)->withQueryString();

        // ── Summary stats untuk filter yang aktif ───────────────────────────
        $summaryQuery = Sale::where('store_id', $storeId)
            ->where('status', 'completed');

        if ($request->filled('date_from')) {
            $summaryQuery->whereDate('sold_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $summaryQuery->whereDate('sold_at', '<=', $request->date_to);
        }
        if (! $user->hasRole('super-admin') && ! $user->hasPermissionTo('transactions-all')) {
            $summaryQuery->where('cashier_id', $user->id);
        }

        $summary = $summaryQuery->selectRaw('
            COUNT(*) as total_transactions,
            COALESCE(SUM(total), 0) as total_revenue,
            COALESCE(SUM(cogs_total), 0) as total_cogs,
            COALESCE(SUM(gross_profit), 0) as total_gross_profit,
            COALESCE(AVG(gross_margin_pct), 0) as avg_margin
        ')->first();

        return Inertia::render('Dashboard/Transactions/History', [
            'sales'   => $sales,
            'filters' => $request->only('date_from', 'date_to', 'q', 'sale_number', 'status'),
            'summary' => $summary,
        ]);
    }

    // =========================================================================
    // PRINT — Struk/receipt penjualan
    // GET /dashboard/transactions/print/{saleNumber}
    // =========================================================================

    public function print(string $saleNumber, Request $request): Response
    {
        $sale = Sale::with([
                'items.packagings.packagingMaterial',
                'payments.paymentMethod',
                'store',
                'cashier:id,name',
                'salesPerson:id,name',
                'customer:id,name,phone,code',
            ])
            ->where('sale_number', str_replace('-', '/', $saleNumber))
            ->orWhere('sale_number', $saleNumber)
            ->firstOrFail();

        return Inertia::render('Dashboard/Transactions/Print', [
            'sale'            => $sale,
            // fromTransaction = true saat redirect dari checkout (bukan akses langsung)
            'fromTransaction' => session()->pull('from_transaction', false),
        ]);
    }

    // =========================================================================
    // GET VARIANTS FOR INTENSITY — ALUR BARU: Step 2 (setelah intensity dipilih)
    // GET /dashboard/transactions/get-variants?intensity_id=X
    // Route name: transactions.get-variants
    //
    // Kembalikan variant yang punya minimal 1 harga aktif untuk intensity ini.
    // Filter store whitelist juga diterapkan.
    // =========================================================================

    public function getVariantsForIntensity(Request $request): JsonResponse
    {
        $request->validate(['intensity_id' => 'required|uuid|exists:intensities,id']);

        $user    = Auth::user();
        $storeId = $user->default_store_id;
        $store   = $storeId ? Store::with('storeCategory')->find($storeId) : null;

        // Variant yang punya harga untuk intensity ini (via products atau langsung)
        // Cukup semua variant aktif — harga dicek di step get-sizes
        $variantQuery = Variant::where('is_active', true)->orderBy('sort_order');

        // Store whitelist filter
        if ($store && $store->store_category_id) {
            $category = $store->storeCategory;
            if ($category && ! $category->allow_all_variants) {
                $allowedIds = $category->variants()
                    ->wherePivot('is_active', true)
                    ->pluck('variants.id');

                if ($allowedIds->isNotEmpty()) {
                    $variantQuery->whereIn('id', $allowedIds);
                }
            }
        }

        $variants = $variantQuery->get(['id', 'name', 'code', 'gender', 'image']);

        return response()->json([
            'success' => true,
            'data'    => $variants,
        ]);
    }

    // =========================================================================
    // GET AVAILABLE SIZES — Step 3 (setelah variant dipilih)
    // GET /dashboard/transactions/get-sizes?intensity_id=X&variant_id=Y
    // =========================================================================

    public function getAvailableSizes(Request $request): JsonResponse
    {
        $request->validate([
            'intensity_id' => 'required|uuid|exists:intensities,id',
            'variant_id'   => 'required|uuid|exists:variants,id',
        ]);

        $priceRows = IntensitySizePrice::where('intensity_id', $request->intensity_id)
            ->where('is_active', true)
            ->get(['size_id', 'price']);

        if ($priceRows->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
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

        return response()->json(['success' => true, 'data' => $sizes]);
    }

    // =========================================================================
    // GET PERFUME PRICE
    // POST /dashboard/transactions/get-perfume-price
    // Sertakan packaging gratis (is_free=true) → effective_price = 0
    // =========================================================================

    public function getPerfumePrice(Request $request): JsonResponse
    {
        $request->validate([
            'intensity_id'    => 'required|uuid|exists:intensities,id',
            'variant_id'      => 'required|uuid|exists:variants,id',
            'size_id'         => 'required|uuid|exists:sizes,id',
            'packaging_ids'   => 'nullable|array',
            'packaging_ids.*' => 'uuid|exists:packaging_materials,id',
        ]);

        $perfumePrice = IntensitySizePrice::where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->value('price');

        $product = Product::where('variant_id', $request->variant_id)
            ->where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->first();

        if ($perfumePrice === null && $product !== null) {
            $perfumePrice = $product->selling_price;
        }

        if ($perfumePrice === null) {
            return response()->json([
                'success' => false,
                'message' => 'Harga belum diatur untuk ukuran ini. Silakan hubungi admin.',
            ], 422);
        }

        // ── Packaging: hitung effective_price (0 jika is_free) ───────────────
        $packagingTotal   = 0;
        $packagingDetails = [];

        if ($request->filled('packaging_ids')) {
            PackagingMaterial::whereIn('id', $request->packaging_ids)
                ->where('is_active', true)
                ->get(['id', 'name', 'selling_price', 'is_free',
                       'free_condition_note', 'average_cost'])
                ->each(function ($pkg) use (&$packagingTotal, &$packagingDetails) {
                    $effectivePrice = $pkg->is_free ? 0 : (int) ($pkg->selling_price ?? 0);
                    $packagingTotal += $effectivePrice;
                    $packagingDetails[] = [
                        'id'              => $pkg->id,
                        'name'            => $pkg->name,
                        'price'           => $pkg->selling_price,   // harga asli
                        'effective_price' => $effectivePrice,        // 0 jika gratis
                        'is_free'         => $pkg->is_free,
                        'free_note'       => $pkg->free_condition_note,
                        'average_cost'    => $pkg->average_cost,     // untuk HPP
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
    // =========================================================================

    public function addToCart(Request $request): RedirectResponse
    {
        $request->validate([
            'intensity_id'    => 'required|uuid|exists:intensities,id',
            'variant_id'      => 'required|uuid|exists:variants,id',
            'size_id'         => 'required|uuid|exists:sizes,id',
            'qty'             => 'required|integer|min:1|max:99',
            'packaging_ids'   => 'nullable|array',
            'packaging_ids.*' => 'uuid|exists:packaging_materials,id',
        ]);

        $user    = Auth::user();
        $storeId = $user->default_store_id;

        abort_unless($storeId, 422, 'Toko default tidak ditemukan. Hubungi admin.');

        $product = Product::where('variant_id', $request->variant_id)
            ->where('intensity_id', $request->intensity_id)
            ->where('size_id', $request->size_id)
            ->where('is_active', true)
            ->first();

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

            if ($request->filled('packaging_ids')) {
                PackagingMaterial::whereIn('id', $request->packaging_ids)
                    ->where('is_active', true)
                    ->get()
                    ->each(function ($pkg) use ($cart) {
                        // effective_price: 0 jika is_free, jika tidak pakai selling_price
                        $effectivePrice = $pkg->is_free ? 0 : (int) ($pkg->selling_price ?? 0);
                        CartPackaging::create([
                            'cart_id'               => $cart->id,
                            'packaging_material_id' => $pkg->id,
                            'qty'                   => 1,
                            'unit_price'            => $effectivePrice,
                        ]);
                    });
            }
        });

        return back();
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

        return back();
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

        return back();
    }

    // =========================================================================
    // HOLD CART
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
    // =========================================================================

    public function resumeHeldCart(string $holdId): RedirectResponse
    {
        $user    = Auth::user();
        $storeId = $user->default_store_id;

        DB::transaction(function () use ($user, $storeId, $holdId) {
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
    //
    // Packaging gratis (is_free):
    //   - unit_price di SaleItemPackaging = 0 (tidak menambah revenue)
    //   - cogs_total tetap dihitung dari average_cost (masuk HPP)
    //   - label 'GRATIS' disimpan di packaging_name
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

        $standalonePkgs = [];
        foreach ((array) $request->standalone_packagings as $sp) {
            $pkg = PackagingMaterial::find($sp['packaging_material_id'] ?? null);
            if ($pkg) {
                $standalonePkgs[] = ['pkg' => $pkg, 'qty' => (int) ($sp['qty'] ?? 1)];
            }
        }

        $sale = DB::transaction(function () use (
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

            $cogsTotal   = $cogsPerfume + $cogsPackaging;
            $grossProfit = $total - $cogsTotal;
            $marginPct   = $total > 0 ? round($grossProfit / $total * 100, 2) : 0;

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

            // ── Sale Items ─────────────────────────────────────────────────
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

                foreach ($cart->packagings as $cartPkg) {
                    $this->createSaleItemPackaging($saleItem->id, $cartPkg);
                }
            }

            // ── Standalone packagings ──────────────────────────────────────
            foreach ($standalonePkgs as $sp) {
                $pkg     = $sp['pkg'];
                $qty     = $sp['qty'];
                // Harga efektif: 0 jika gratis, else selling_price
                $unitEffective = $pkg->is_free ? 0 : (int) ($pkg->selling_price ?? 0);
                $pkgSub  = $unitEffective * $qty;
                $pkgCogs = (int) (($pkg->average_cost ?? 0) * $qty);

                $nameSuffix = $pkg->is_free ? ' [GRATIS]' : '';

                SaleItem::create([
                    'sale_id'               => $sale->id,
                    'product_id'            => null,
                    'product_name'          => '[Kemasan] ' . $pkg->name . $nameSuffix,
                    'product_sku'           => $pkg->code,
                    'variant_name'          => null,
                    'intensity_code'        => null,
                    'size_ml'               => null,
                    'qty'                   => $qty,
                    'unit_price'            => $unitEffective,
                    'item_discount'         => 0,
                    'subtotal'              => $pkgSub,
                    'cogs_per_unit'         => $pkg->average_cost ?? 0,
                    'cogs_total'            => $pkgCogs,
                    'line_gross_profit'     => $pkgSub - $pkgCogs,
                    'line_gross_margin_pct' => $pkgSub > 0
                        ? round(($pkgSub - $pkgCogs) / $pkgSub * 100, 2) : 0,
                    'notes'                 => $pkg->is_free
                        ? 'Kemasan gratis: ' . ($pkg->free_condition_note ?? 'Gratis')
                        : 'Kemasan standalone',
                ]);
            }

            // ── Sale Discount ──────────────────────────────────────────────
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
                        'store_id'         => $storeId,
                        'discount_amount'  => (int) $discountAmount,
                        'original_amount'  => (int) $subtotal,
                        'final_amount'     => (int) $total,
                        'amount_saved'     => (int) $discountAmount,
                        'used_at'          => now(),
                    ]);
                }
            }

            // ── Sale Payment ───────────────────────────────────────────────
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

            // ── Loyalty Points ─────────────────────────────────────────────
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
                        'balance_after'  => $customer->fresh()->points,
                        'reference_type' => Sale::class,
                        'reference_id'   => $sale->id,
                        'notes'          => "Pembelian {$sale->sale_number}",
                    ]);
                }
            }

            Cart::where('cashier_id', $user->id)
                ->where('store_id', $storeId)
                ->whereNull('hold_id')
                ->delete();

            return $sale;
        });

        return redirect()->route('transactions.print', ['saleNumber' => str_replace('/', '-', $sale->sale_number)])
            ->with('success', 'Transaksi berhasil disimpan!')
            ->with('from_transaction', true);
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
                'packagings.packagingMaterial:id,name,code,selling_price,is_free,free_condition_note',
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
            $pkgTotal = $cart->packagings->sum(
                fn ($p) => ($p->unit_price ?? 0) * ($p->qty ?? 1)
            );
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
     * Hitung subtotals.
     * PENTING: packaging gratis (is_free) → unit_price = 0, tapi HPP tetap dihitung.
     */
    private function calcSubtotals(Collection $carts, array $standalonePkgs): array
    {
        $sp = $sc = $cp = $cc = 0;

        foreach ($carts as $cart) {
            $sp += $cart->unit_price * $cart->qty;
            $cp += ($cart->product?->production_cost ?? 0) * $cart->qty;
            foreach ($cart->packagings as $pkg) {
                // unit_price sudah 0 jika is_free (disimpan saat add-to-cart)
                $sc += $pkg->unit_price * $pkg->qty;
                $cc += ($pkg->packagingMaterial?->average_cost ?? 0) * $pkg->qty;
            }
        }

        foreach ($standalonePkgs as $s) {
            $effectivePrice = $s['pkg']->is_free ? 0 : ($s['pkg']->selling_price ?? 0);
            $sc += $effectivePrice * $s['qty'];
            $cc += ($s['pkg']->average_cost ?? 0) * $s['qty'];
        }

        return [(int) $sp, (int) $sc, (int) $cp, (int) $cc];
    }

    /**
     * Buat SaleItemPackaging.
     * Jika packaging gratis: nama diberi suffix [GRATIS], unit_price = 0,
     * cogs_total tetap dihitung (dari average_cost).
     */
    private function createSaleItemPackaging(string $saleItemId, $cartPkg): void
    {
        $pkg      = $cartPkg->packagingMaterial;
        $isFree   = $pkg?->is_free ?? false;

        // unit_price di cart sudah 0 jika is_free (set saat add-to-cart)
        $unitPrice = $cartPkg->unit_price;
        $sub       = $unitPrice * $cartPkg->qty;
        $unitCost  = $pkg?->average_cost ?? 0;
        $cogs      = $unitCost * $cartPkg->qty;

        $name = ($pkg?->name ?? 'Packaging') . ($isFree ? ' [GRATIS]' : '');

        SaleItemPackaging::create([
            'sale_item_id'          => $saleItemId,
            'packaging_material_id' => $cartPkg->packaging_material_id,
            'packaging_name'        => $name,
            'packaging_code'        => $pkg?->code,
            'qty'                   => $cartPkg->qty,
            'unit_price'            => $unitPrice,
            'subtotal'              => $sub,
            'unit_cost'             => $unitCost,
            'cogs_total'            => $cogs,
            'line_gross_profit'     => $sub - $cogs,
            'line_gross_margin_pct' => $sub > 0
                ? round(($sub - $cogs) / $sub * 100, 2) : 0,
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
        // Format: INV-20260306-00001 (pakai dash bukan slash agar aman di URL)
        $prefix = 'INV-' . now()->format('Ymd') . '-';
        $last   = Sale::where('sale_number', 'like', $prefix . '%')
            ->lockForUpdate()
            ->orderByDesc('sale_number')
            ->value('sale_number');
        $seq    = $last ? ((int) substr($last, -5)) + 1 : 1;
        return $prefix . str_pad($seq, 5, '0', STR_PAD_LEFT);
    }
}
