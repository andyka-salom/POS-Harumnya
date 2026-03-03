<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user         = auth()->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') ? $user->isSuperAdmin() : false;
        $storeId      = $user->default_store_id ?? null;

        // ── Period filter ─────────────────────────────────────────────────
        $period    = $request->input('period', '30');   // days
        $startDate = Carbon::now()->subDays((int) $period)->startOfDay();
        $endDate   = Carbon::now()->endOfDay();

        $prevStart = Carbon::now()->subDays((int) $period * 2)->startOfDay();
        $prevEnd   = Carbon::now()->subDays((int) $period)->endOfDay();

        // ── Helper: sales scope menggunakan kolom sold_at ─────────────────
        // Migration: sales.sold_at (timestamp), bukan sale_date + sale_time
        $baseScope = fn($q) => $q
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$startDate, $endDate])
            ->when(! $isSuperAdmin && $storeId, fn($q2) => $q2->where('store_id', $storeId));

        $prevScope = fn($q) => $q
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$prevStart, $prevEnd])
            ->when(! $isSuperAdmin && $storeId, fn($q2) => $q2->where('store_id', $storeId));

        // ══════════════════════════════════════════════════════════════════
        //  KPI CARDS
        // ══════════════════════════════════════════════════════════════════

        // Migration: sales.subtotal_before_discount TIDAK ADA → gunakan sales.subtotal
        // Migration: sales.points_earned ADA ✓
        // Migration: sales.gross_profit ADA ✓
        // Migration: sales.cogs_total ADA ✓
        // Migration: sales.discount_amount ADA ✓
        $kpiCurrent = DB::table('sales')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$startDate, $endDate])
            ->selectRaw('
                COALESCE(SUM(total), 0)             AS total_revenue,
                COALESCE(SUM(gross_profit), 0)      AS total_profit,
                COALESCE(SUM(cogs_total), 0)        AS total_cogs,
                COALESCE(AVG(total), 0)             AS avg_order,
                COUNT(*)                            AS total_transactions,
                COALESCE(SUM(discount_amount), 0)   AS total_discount,
                COALESCE(SUM(points_earned), 0)     AS total_points_earned
            ')
            ->first();

        $kpiPrev = DB::table('sales')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$prevStart, $prevEnd])
            ->selectRaw('
                COALESCE(SUM(total), 0)         AS total_revenue,
                COALESCE(SUM(gross_profit), 0)  AS total_profit,
                COALESCE(SUM(cogs_total), 0)    AS total_cogs,
                COUNT(*)                        AS total_transactions
            ')
            ->first();

        $todayKpi = DB::table('sales')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereDate('sold_at', Carbon::today())
            ->selectRaw('
                COALESCE(SUM(total), 0)  AS today_revenue,
                COUNT(*)                 AS today_transactions
            ')
            ->first();

        $trend = fn($cur, $prev) => $prev > 0
            ? round((($cur - $prev) / $prev) * 100, 1)
            : null;

        // ══════════════════════════════════════════════════════════════════
        //  REVENUE TREND (last N days, up to 30 data points)
        // ══════════════════════════════════════════════════════════════════

        // Gunakan DATE(sold_at) untuk group per hari
        $revenueTrend = DB::table('sales')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$startDate, $endDate])
            ->selectRaw('
                DATE(sold_at)                        AS date,
                COALESCE(SUM(total), 0)              AS revenue,
                COALESCE(SUM(gross_profit), 0)       AS profit,
                COALESCE(SUM(cogs_total), 0)         AS cogs,
                COUNT(*)                             AS transactions
            ')
            ->groupBy(DB::raw('DATE(sold_at)'))
            ->orderBy(DB::raw('DATE(sold_at)'))
            ->get()
            ->map(fn($r) => [
                'date'         => Carbon::parse($r->date)->format('d M'),
                'raw_date'     => $r->date,
                'revenue'      => (int) $r->revenue,
                'profit'       => (int) $r->profit,
                'cogs'         => (int) $r->cogs,
                'transactions' => (int) $r->transactions,
            ]);

        // ══════════════════════════════════════════════════════════════════
        //  SALES BY INTENSITY
        // ══════════════════════════════════════════════════════════════════

        $salesByIntensity = DB::table('sale_items')
            ->join('sales',       'sale_items.sale_id',    '=', 'sales.id')
            ->join('products',    'sale_items.product_id', '=', 'products.id')
            ->join('intensities', 'products.intensity_id', '=', 'intensities.id')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$startDate, $endDate])
            ->selectRaw('
                intensities.code                        AS code,
                intensities.name                        AS name,
                SUM(sale_items.qty)                     AS total_qty,
                COALESCE(SUM(sale_items.subtotal), 0)   AS total_revenue,
                COALESCE(SUM(sale_items.cogs_total), 0) AS total_cogs
            ')
            ->groupBy('intensities.id', 'intensities.code', 'intensities.name')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(fn($r) => [
                'code'    => $r->code,
                'name'    => $r->name,
                'qty'     => (int) $r->total_qty,
                'revenue' => (int) $r->total_revenue,
                'cogs'    => (int) $r->total_cogs,
            ]);

        $totalIntensityRevenue = $salesByIntensity->sum('revenue') ?: 1;
        $salesByIntensity = $salesByIntensity->map(fn($r) => array_merge($r, [
            'pct' => round(($r['revenue'] / $totalIntensityRevenue) * 100, 1),
        ]));

        // ══════════════════════════════════════════════════════════════════
        //  SALES BY SIZE
        // ══════════════════════════════════════════════════════════════════

        $salesBySize = DB::table('sale_items')
            ->join('sales',    'sale_items.sale_id',    '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sizes',    'products.size_id',      '=', 'sizes.id')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$startDate, $endDate])
            ->selectRaw('
                sizes.volume_ml                         AS volume_ml,
                sizes.name                              AS name,
                SUM(sale_items.qty)                     AS total_qty,
                COALESCE(SUM(sale_items.subtotal), 0)   AS total_revenue
            ')
            ->groupBy('sizes.id', 'sizes.volume_ml', 'sizes.name')
            ->orderByDesc('total_qty')
            ->get()
            ->map(fn($r) => [
                'volume_ml' => (int) $r->volume_ml,
                'name'      => $r->name,
                'qty'       => (int) $r->total_qty,
                'revenue'   => (int) $r->total_revenue,
            ]);

        // ══════════════════════════════════════════════════════════════════
        //  TOP VARIANTS (by qty sold)
        // ══════════════════════════════════════════════════════════════════

        $topVariants = DB::table('sale_items')
            ->join('sales',    'sale_items.sale_id',    '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('variants', 'products.variant_id',   '=', 'variants.id')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$startDate, $endDate])
            ->selectRaw('
                variants.id                                        AS variant_id,
                variants.name                                      AS variant_name,
                variants.gender                                    AS gender,
                SUM(sale_items.qty)                                AS total_qty,
                COALESCE(SUM(sale_items.subtotal), 0)              AS total_revenue,
                COALESCE(SUM(sale_items.cogs_total), 0)            AS total_cogs,
                COALESCE(SUM(sale_items.line_gross_profit), 0)     AS total_profit
            ')
            ->groupBy('variants.id', 'variants.name', 'variants.gender')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'variant_id' => $r->variant_id,
                'name'       => $r->variant_name,
                'gender'     => $r->gender,
                'qty'        => (int) $r->total_qty,
                'revenue'    => (int) $r->total_revenue,
                'cogs'       => (int) $r->total_cogs,
                'profit'     => (int) $r->total_profit,
                'margin'     => $r->total_revenue > 0
                    ? round(($r->total_profit / $r->total_revenue) * 100, 1)
                    : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════
        //  TOP CUSTOMERS
        // ══════════════════════════════════════════════════════════════════

        $topCustomers = DB::table('sales')
            ->join('customers', 'sales.customer_id', '=', 'customers.id')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$startDate, $endDate])
            ->whereNotNull('sales.customer_id')
            ->selectRaw('
                customers.id            AS customer_id,
                customers.name          AS name,
                customers.phone         AS phone,
                customers.tier          AS tier,
                customers.points        AS points,
                COUNT(sales.id)         AS total_orders,
                COALESCE(SUM(sales.total), 0) AS total_spending
            ')
            ->groupBy('customers.id', 'customers.name', 'customers.phone', 'customers.tier', 'customers.points')
            ->orderByDesc('total_spending')
            ->limit(7)
            ->get()
            ->map(fn($r) => [
                'customer_id'    => $r->customer_id,
                'name'           => $r->name,
                'phone'          => $r->phone,
                'tier'           => $r->tier,
                'points'         => (int) $r->points,
                'total_orders'   => (int) $r->total_orders,
                'total_spending' => (int) $r->total_spending,
            ]);

        // ══════════════════════════════════════════════════════════════════
        //  STORE PERFORMANCE (super admin only)
        // ══════════════════════════════════════════════════════════════════

        $storePerformance = [];
        if ($isSuperAdmin) {
            $storePerformance = DB::table('sales')
                ->join('stores', 'sales.store_id', '=', 'stores.id')
                ->where('sales.status', 'completed')
                ->whereBetween('sales.sold_at', [$startDate, $endDate])
                ->selectRaw('
                    stores.id                               AS store_id,
                    stores.name                             AS store_name,
                    stores.code                             AS store_code,
                    COUNT(sales.id)                         AS total_transactions,
                    COALESCE(SUM(sales.total), 0)           AS total_revenue,
                    COALESCE(SUM(sales.gross_profit), 0)    AS total_profit,
                    COALESCE(SUM(sales.cogs_total), 0)      AS total_cogs,
                    COALESCE(AVG(sales.total), 0)           AS avg_order
                ')
                ->groupBy('stores.id', 'stores.name', 'stores.code')
                ->orderByDesc('total_revenue')
                ->get()
                ->map(fn($r) => [
                    'store_id'           => $r->store_id,
                    'store_name'         => $r->store_name,
                    'store_code'         => $r->store_code,
                    'total_transactions' => (int) $r->total_transactions,
                    'total_revenue'      => (int) $r->total_revenue,
                    'total_profit'       => (int) $r->total_profit,
                    'total_cogs'         => (int) $r->total_cogs,
                    'avg_order'          => (int) $r->avg_order,
                    'margin'             => $r->total_revenue > 0
                        ? round(($r->total_profit / $r->total_revenue) * 100, 1)
                        : 0,
                ])
                ->toArray();
        }

        // ══════════════════════════════════════════════════════════════════
        //  PAYMENT METHOD BREAKDOWN
        // ══════════════════════════════════════════════════════════════════

        $paymentBreakdown = DB::table('sale_payments')
            ->join('sales',           'sale_payments.sale_id',           '=', 'sales.id')
            ->join('payment_methods', 'sale_payments.payment_method_id', '=', 'payment_methods.id')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$startDate, $endDate])
            ->selectRaw('
                payment_methods.name                        AS method_name,
                payment_methods.type                        AS method_type,
                COUNT(DISTINCT sales.id)                    AS total_transactions,
                COALESCE(SUM(sale_payments.amount), 0)      AS total_amount
            ')
            ->groupBy('payment_methods.id', 'payment_methods.name', 'payment_methods.type')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn($r) => [
                'method_name'        => $r->method_name,
                'method_type'        => $r->method_type,
                'total_transactions' => (int) $r->total_transactions,
                'total_amount'       => (int) $r->total_amount,
            ]);

        // ══════════════════════════════════════════════════════════════════
        //  TOP PACKAGING ADD-ONS
        // ══════════════════════════════════════════════════════════════════

        // Migration: sale_item_packagings.packaging_material_id (FK ke packaging_materials)
        $topPackaging = DB::table('sale_item_packagings')
            ->join('sale_items',          'sale_item_packagings.sale_item_id',          '=', 'sale_items.id')
            ->join('sales',               'sale_items.sale_id',                          '=', 'sales.id')
            ->join('packaging_materials', 'sale_item_packagings.packaging_material_id',  '=', 'packaging_materials.id')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$startDate, $endDate])
            ->selectRaw('
                packaging_materials.id                              AS id,
                packaging_materials.name                            AS name,
                packaging_materials.code                            AS code,
                SUM(sale_item_packagings.qty)                       AS total_qty,
                COALESCE(SUM(sale_item_packagings.subtotal), 0)     AS total_revenue
            ')
            ->groupBy('packaging_materials.id', 'packaging_materials.name', 'packaging_materials.code')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'id'      => $r->id,
                'name'    => $r->name,
                'code'    => $r->code,
                'qty'     => (int) $r->total_qty,
                'revenue' => (int) $r->total_revenue,
            ]);

        // ══════════════════════════════════════════════════════════════════
        //  RECENT TRANSACTIONS
        // ══════════════════════════════════════════════════════════════════

        // Migration: sales.sold_at (timestamp), snapshot cashier_name & customer_name tersimpan
        // cashier_name & customer_name sudah di-snapshot di tabel sales → bisa pakai langsung
        // Tetap join customers & users untuk fallback jika nama belum di-snapshot
        $recentTransactions = DB::table('sales')
            ->leftJoin('customers',      'sales.customer_id', '=', 'customers.id')
            ->leftJoin('users as cashier','sales.cashier_id', '=', 'cashier.id')
            ->join('stores',             'sales.store_id',    '=', 'stores.id')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->selectRaw('
                sales.id,
                sales.sale_number,
                sales.sold_at,
                sales.total,
                sales.discount_amount,
                sales.gross_profit,
                sales.status,
                COALESCE(sales.customer_name, customers.name)   AS customer_name,
                COALESCE(sales.cashier_name, cashier.name)      AS cashier_name,
                stores.name                                     AS store_name
            ')
            ->orderByDesc('sales.sold_at')
            ->limit(8)
            ->get()
            ->map(fn($r) => [
                'id'           => $r->id,
                'invoice'      => $r->sale_number,
                'date'         => Carbon::parse($r->sold_at)->format('d M Y H:i'),
                'customer'     => $r->customer_name ?? 'Walk-in',
                'cashier'      => $r->cashier_name  ?? '-',
                'store'        => $r->store_name,
                'total'        => (int) $r->total,
                'discount'     => (int) $r->discount_amount,
                'gross_profit' => (int) $r->gross_profit,
                'status'       => $r->status,
            ]);

        // ══════════════════════════════════════════════════════════════════
        //  ACTIVE CASH DRAWER — tabel cash_drawers belum ada, dinonaktifkan
        // ══════════════════════════════════════════════════════════════════
        $activeCashDrawer = null;

        // ══════════════════════════════════════════════════════════════════
        //  LOW STOCK: INGREDIENTS (store)
        // ══════════════════════════════════════════════════════════════════

        $lowStockIngredients = [];
        if ($storeId) {
            $lowStockIngredients = DB::table('store_ingredient_stocks as sis')
                ->join('ingredients as ing',          'sis.ingredient_id',              '=', 'ing.id')
                ->join('ingredient_categories as ic', 'ing.ingredient_category_id',     '=', 'ic.id')
                ->where('sis.store_id', $storeId)
                ->whereNotNull('sis.min_stock')
                ->whereRaw('sis.quantity <= sis.min_stock')
                ->where('ing.is_active', true)
                ->selectRaw('
                    ing.id,
                    ing.name,
                    ing.unit,
                    ic.ingredient_type,
                    sis.quantity    AS current_qty,
                    sis.min_stock   AS min_qty
                ')
                ->orderByRaw('sis.quantity / NULLIF(sis.min_stock, 0) ASC')
                ->limit(6)
                ->get()
                ->map(fn($r) => [
                    'id'      => $r->id,
                    'name'    => $r->name,
                    'unit'    => $r->unit,
                    'type'    => $r->ingredient_type,
                    'current' => (int) $r->current_qty,
                    'minimum' => (int) $r->min_qty,
                    'pct'     => $r->min_qty > 0
                        ? round(($r->current_qty / $r->min_qty) * 100)
                        : 0,
                    'status'  => $r->current_qty <= 0 ? 'empty'
                        : ($r->current_qty <= ($r->min_qty * 0.3) ? 'critical' : 'low'),
                ]);
        }

        // ── Warehouse low stock (super admin)
        $lowStockWarehouse = [];
        if ($isSuperAdmin) {
            $lowStockWarehouse = DB::table('warehouse_ingredient_stocks as wis')
                ->join('ingredients as ing', 'wis.ingredient_id', '=', 'ing.id')
                ->join('warehouses as wh',   'wis.warehouse_id',  '=', 'wh.id')
                ->whereNotNull('wis.min_stock')
                ->whereRaw('wis.quantity <= wis.min_stock')
                ->where('ing.is_active', true)
                ->selectRaw('
                    ing.id,
                    ing.name,
                    ing.unit,
                    wh.name         AS warehouse_name,
                    wis.quantity    AS current_qty,
                    wis.min_stock   AS min_qty
                ')
                ->orderByRaw('wis.quantity / NULLIF(wis.min_stock, 0) ASC')
                ->limit(5)
                ->get()
                ->map(fn($r) => [
                    'id'             => $r->id,
                    'name'           => $r->name,
                    'unit'           => $r->unit,
                    'warehouse_name' => $r->warehouse_name,
                    'current'        => (int) $r->current_qty,
                    'minimum'        => (int) $r->min_qty,
                    'pct'            => $r->min_qty > 0
                        ? round(($r->current_qty / $r->min_qty) * 100)
                        : 0,
                    'status'         => $r->current_qty <= 0 ? 'empty'
                        : ($r->current_qty <= ($r->min_qty * 0.3) ? 'critical' : 'low'),
                ]);
        }

        // ══════════════════════════════════════════════════════════════════
        //  DISCOUNT USAGE SUMMARY
        // ══════════════════════════════════════════════════════════════════

        // Migration: sale_discounts.discount_category ADA ✓
        $discountUsage = DB::table('sale_discounts')
            ->join('sales', 'sale_discounts.sale_id', '=', 'sales.id')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$startDate, $endDate])
            ->selectRaw('
                sale_discounts.discount_category                        AS category,
                COUNT(DISTINCT sales.id)                                AS usage_count,
                COALESCE(SUM(sale_discounts.applied_amount), 0)         AS total_discount_given
            ')
            ->groupBy('sale_discounts.discount_category')
            ->orderByDesc('total_discount_given')
            ->get()
            ->map(fn($r) => [
                'category'             => $r->category,
                'usage_count'          => (int) $r->usage_count,
                'total_discount_given' => (int) $r->total_discount_given,
            ]);

        // ══════════════════════════════════════════════════════════════════
        //  SALES PEOPLE PERFORMANCE
        // ══════════════════════════════════════════════════════════════════

        $salesPeoplePerformance = DB::table('sales')
            ->join('sales_people', 'sales.sales_person_id', '=', 'sales_people.id')
            ->when(! $isSuperAdmin && $storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$startDate, $endDate])
            ->whereNotNull('sales.sales_person_id')
            ->selectRaw('
                sales_people.id,
                sales_people.name,
                sales_people.code,
                COUNT(sales.id)                 AS total_transactions,
                COALESCE(SUM(sales.total), 0)   AS total_revenue,
                COALESCE(AVG(sales.total), 0)   AS avg_order
            ')
            ->groupBy('sales_people.id', 'sales_people.name', 'sales_people.code')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'id'                 => $r->id,
                'name'               => $r->name,
                'code'               => $r->code,
                'total_transactions' => (int) $r->total_transactions,
                'total_revenue'      => (int) $r->total_revenue,
                'avg_order'          => (int) $r->avg_order,
            ]);

        // ══════════════════════════════════════════════════════════════════
        //  SUMMARY COUNTS
        // ══════════════════════════════════════════════════════════════════

        $totalVariants    = DB::table('variants')->where('is_active', true)->count();
        $totalIngredients = DB::table('ingredients')->where('is_active', true)->count();
        $totalCustomers   = DB::table('customers')->where('is_active', true)->count();
        $totalStores      = DB::table('stores')->where('is_active', true)->count();
        $totalProducts    = DB::table('products')->where('is_active', true)->count();

        $currentStore = $storeId
            ? DB::table('stores')->where('id', $storeId)->first()
            : null;

        // ══════════════════════════════════════════════════════════════════
        //  RETURN TO INERTIA
        // ══════════════════════════════════════════════════════════════════

        return Inertia::render('Dashboard', [
            // Meta
            'period'       => (int) $period,
            'isSuperAdmin' => $isSuperAdmin,
            'currentStore' => $currentStore ? [
                'id'   => $currentStore->id,
                'name' => $currentStore->name,
                'code' => $currentStore->code,
            ] : null,

            // KPI
            'kpi' => [
                'totalRevenue'      => (int) ($kpiCurrent->total_revenue ?? 0),
                'totalProfit'       => (int) ($kpiCurrent->total_profit ?? 0),
                'totalCogs'         => (int) ($kpiCurrent->total_cogs ?? 0),
                'avgOrder'          => (int) ($kpiCurrent->avg_order ?? 0),
                'totalTransactions' => (int) ($kpiCurrent->total_transactions ?? 0),
                'totalDiscount'     => (int) ($kpiCurrent->total_discount ?? 0),
                'totalPointsEarned' => (int) ($kpiCurrent->total_points_earned ?? 0),
                'marginPct'         => ($kpiCurrent->total_revenue ?? 0) > 0
                    ? round(($kpiCurrent->total_profit / $kpiCurrent->total_revenue) * 100, 1)
                    : 0,
                'todayRevenue'      => (int) ($todayKpi->today_revenue ?? 0),
                'todayTransactions' => (int) ($todayKpi->today_transactions ?? 0),
                'trendRevenue'      => $trend($kpiCurrent->total_revenue ?? 0, $kpiPrev->total_revenue ?? 0),
                'trendProfit'       => $trend($kpiCurrent->total_profit ?? 0, $kpiPrev->total_profit ?? 0),
                'trendTransactions' => $trend($kpiCurrent->total_transactions ?? 0, $kpiPrev->total_transactions ?? 0),
                'trendCogs'         => $trend($kpiCurrent->total_cogs ?? 0, $kpiPrev->total_cogs ?? 0),
            ],

            // Counts
            'counts' => [
                'variants'    => $totalVariants,
                'ingredients' => $totalIngredients,
                'customers'   => $totalCustomers,
                'stores'      => $totalStores,
                'products'    => $totalProducts,
            ],

            // Charts
            'revenueTrend'     => $revenueTrend,
            'salesByIntensity' => $salesByIntensity,
            'salesBySize'      => $salesBySize,
            'paymentBreakdown' => $paymentBreakdown,
            'discountUsage'    => $discountUsage,

            // Rankings
            'topVariants'            => $topVariants,
            'topCustomers'           => $topCustomers,
            'topPackaging'           => $topPackaging,
            'salesPeoplePerformance' => $salesPeoplePerformance,

            // Store (super admin)
            'storePerformance' => $storePerformance,

            // Operations
            'activeCashDrawer'   => $activeCashDrawer,
            'lowStockIngredients'=> $lowStockIngredients,
            'lowStockWarehouse'  => $lowStockWarehouse,
            'recentTransactions' => $recentTransactions,
        ]);
    }
}
