<?php

namespace App\Http\Controllers\Laporan;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class LaporanPenjualanController extends Controller
{
    public function index(Request $request)
    {
        $user         = auth()->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') ? $user->isSuperAdmin() : false;

        // ── Filter params ─────────────────────────────────────────────────────
        $storeId  = $request->input('store_id', $isSuperAdmin ? null : ($user->default_store_id ?? null));
        $dateFrom = $request->input('date_from', Carbon::now()->startOfMonth()->toDateString());
        $dateTo   = $request->input('date_to',   Carbon::now()->toDateString());
        $groupBy  = $request->input('group_by',  'day');       // day | week | month
        $status   = $request->input('status',    'completed'); // completed | all | cancelled | refunded

        $dateFrom = Carbon::parse($dateFrom)->startOfDay();
        $dateTo   = Carbon::parse($dateTo)->endOfDay();

        // ── Daftar toko ───────────────────────────────────────────────────────
        $stores = DB::table('stores')
            ->where('is_active', true)
            ->select('id', 'name', 'code')
            ->orderBy('name')
            ->get();

        // ── PostgreSQL group/label expressions ────────────────────────────────
        // PostgreSQL: TO_CHAR, DATE_TRUNC, EXTRACT — bukan DATE_FORMAT / WEEK
        $groupExpr = match($groupBy) {
            'week'  => "TO_CHAR(DATE_TRUNC('week', sold_at), 'IYYY-IW')",
            'month' => "TO_CHAR(DATE_TRUNC('month', sold_at), 'YYYY-MM')",
            default => "DATE(sold_at)",
        };
        $labelExpr = match($groupBy) {
            'week'  => "CONCAT('Mg ', EXTRACT(WEEK FROM sold_at)::int)",
            'month' => "TO_CHAR(sold_at, 'Mon YYYY')",
            default => "TO_CHAR(sold_at, 'DD Mon')",
        };

        // ══════════════════════════════════════════════════════════════════════
        //  1. RINGKASAN PENJUALAN
        //
        //  PostgreSQL: string literal pakai single quote '...' bukan "..."
        //  Migration : sold_at (timestamp), subtotal (bukan subtotal_before_discount)
        // ══════════════════════════════════════════════════════════════════════
        $summary = DB::table('sales')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->whereBetween('sold_at', [$dateFrom, $dateTo])
            ->selectRaw("
                COUNT(*)                                                    AS total_transactions,
                COALESCE(SUM(total), 0)                                     AS total_revenue,
                COALESCE(SUM(subtotal), 0)                                  AS gross_sales,
                COALESCE(SUM(discount_amount), 0)                           AS total_discount,
                COALESCE(AVG(total), 0)                                     AS avg_order_value,
                COUNT(DISTINCT customer_id)                                 AS unique_customers,
                COUNT(DISTINCT cashier_id)                                  AS active_cashiers,
                COUNT(DISTINCT store_id)                                    AS active_stores,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)       AS completed_count,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)       AS cancelled_count,
                SUM(CASE WHEN status = 'refunded'  THEN 1 ELSE 0 END)       AS refunded_count,
                SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END)    AS member_tx,
                SUM(CASE WHEN customer_id IS NULL     THEN 1 ELSE 0 END)    AS walkin_tx
            ")
            ->first();

        // total_items_sold dihitung dari sale_items (tidak ada di sales header)
        $totalItemsSold = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->sum('sale_items.qty');

        $completionRate = $summary->total_transactions > 0
            ? round(($summary->completed_count / $summary->total_transactions) * 100, 1)
            : 0;

        $memberRate = $summary->total_transactions > 0
            ? round(($summary->member_tx / $summary->total_transactions) * 100, 1)
            : 0;

        // ══════════════════════════════════════════════════════════════════════
        //  2. TREN PENJUALAN (per day / week / month)
        // ══════════════════════════════════════════════════════════════════════
        $trendData = DB::table('sales')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->whereBetween('sold_at', [$dateFrom, $dateTo])
            ->selectRaw("
                {$groupExpr}                                                AS period_key,
                {$labelExpr}                                                AS label,
                COUNT(*)                                                    AS transactions,
                COALESCE(SUM(total), 0)                                     AS revenue,
                COALESCE(SUM(subtotal), 0)                                  AS gross_sales,
                COALESCE(SUM(discount_amount), 0)                           AS discount,
                COALESCE(AVG(total), 0)                                     AS avg_order,
                COUNT(DISTINCT customer_id)                                 AS unique_customers,
                SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END)    AS member_tx
            ")
            ->groupByRaw("{$groupExpr}, {$labelExpr}")
            ->orderByRaw($groupExpr)
            ->get()
            ->map(fn($r) => [
                'label'            => $r->label,
                'transactions'     => (int) $r->transactions,
                'revenue'          => (int) $r->revenue,
                'gross_sales'      => (int) $r->gross_sales,
                'discount'         => (int) $r->discount,
                'avg_order'        => (int) $r->avg_order,
                'unique_customers' => (int) $r->unique_customers,
                'member_tx'        => (int) $r->member_tx,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  3. PENJUALAN PER PRODUK (variant) — Top 15
        // ══════════════════════════════════════════════════════════════════════
        $byVariant = DB::table('sale_items')
            ->join('sales',    'sale_items.sale_id',    '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('variants', 'products.variant_id',   '=', 'variants.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                variants.id,
                variants.name,
                variants.gender,
                SUM(sale_items.qty)                         AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)       AS revenue,
                COALESCE(AVG(sale_items.unit_price), 0)     AS avg_price,
                COUNT(DISTINCT sales.id)                    AS tx_count
            ')
            ->groupBy('variants.id', 'variants.name', 'variants.gender')
            ->orderByDesc('qty')
            ->limit(15)
            ->get()
            ->map(fn($r) => [
                'id'        => $r->id,
                'name'      => $r->name,
                'gender'    => $r->gender,
                'qty'       => (int) $r->qty,
                'revenue'   => (int) $r->revenue,
                'avg_price' => (int) $r->avg_price,
                'tx_count'  => (int) $r->tx_count,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  4. PENJUALAN PER INTENSITAS
        // ══════════════════════════════════════════════════════════════════════
        $byIntensity = DB::table('sale_items')
            ->join('sales',       'sale_items.sale_id',    '=', 'sales.id')
            ->join('products',    'sale_items.product_id', '=', 'products.id')
            ->join('intensities', 'products.intensity_id', '=', 'intensities.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                intensities.code,
                intensities.name,
                SUM(sale_items.qty)                         AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)       AS revenue,
                COUNT(DISTINCT sales.id)                    AS tx_count
            ')
            ->groupBy('intensities.id', 'intensities.code', 'intensities.name')
            ->orderByDesc('qty')
            ->get()
            ->map(fn($r) => [
                'code'     => $r->code,
                'name'     => $r->name,
                'qty'      => (int) $r->qty,
                'revenue'  => (int) $r->revenue,
                'tx_count' => (int) $r->tx_count,
                'pct'      => 0,
            ]);

        $totalQtyInt = $byIntensity->sum('qty');
        $byIntensity = $byIntensity->map(fn($r) => array_merge($r, [
            'pct' => $totalQtyInt > 0 ? round(($r['qty'] / $totalQtyInt) * 100, 1) : 0,
        ]));

        // ══════════════════════════════════════════════════════════════════════
        //  5. PENJUALAN PER UKURAN
        // ══════════════════════════════════════════════════════════════════════
        $bySize = DB::table('sale_items')
            ->join('sales',    'sale_items.sale_id',    '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sizes',    'products.size_id',      '=', 'sizes.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                sizes.volume_ml,
                sizes.name,
                SUM(sale_items.qty)                         AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)       AS revenue
            ')
            ->groupBy('sizes.id', 'sizes.volume_ml', 'sizes.name')
            ->orderByDesc('qty')
            ->get()
            ->map(fn($r) => [
                'volume_ml' => (int) $r->volume_ml,
                'name'      => $r->name,
                'qty'       => (int) $r->qty,
                'revenue'   => (int) $r->revenue,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  6. PENJUALAN PER GENDER
        // ══════════════════════════════════════════════════════════════════════
        $byGender = DB::table('sale_items')
            ->join('sales',    'sale_items.sale_id',    '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('variants', 'products.variant_id',   '=', 'variants.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                variants.gender,
                SUM(sale_items.qty)                         AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)       AS revenue,
                COUNT(DISTINCT sales.id)                    AS tx_count
            ')
            ->groupBy('variants.gender')
            ->orderByDesc('qty')
            ->get()
            ->map(fn($r) => [
                'gender'   => $r->gender ?? 'Unisex',
                'qty'      => (int) $r->qty,
                'revenue'  => (int) $r->revenue,
                'tx_count' => (int) $r->tx_count,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  7. TOP PELANGGAN
        //     Migration: customers.points (bukan total_points)
        // ══════════════════════════════════════════════════════════════════════
        $topCustomers = DB::table('sales')
            ->join('customers', 'sales.customer_id', '=', 'customers.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                customers.id,
                customers.name,
                customers.phone,
                customers.tier,
                customers.points                    AS total_points,
                COUNT(sales.id)                     AS total_orders,
                COALESCE(SUM(sales.total), 0)       AS total_spending,
                COALESCE(AVG(sales.total), 0)       AS avg_order,
                MAX(DATE(sales.sold_at))            AS last_purchase
            ')
            ->groupBy('customers.id', 'customers.name', 'customers.phone', 'customers.tier', 'customers.points')
            ->orderByDesc('total_spending')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'id'             => $r->id,
                'name'           => $r->name,
                'phone'          => $r->phone,
                'tier'           => $r->tier,
                'total_points'   => (int) $r->total_points,
                'total_orders'   => (int) $r->total_orders,
                'total_spending' => (int) $r->total_spending,
                'avg_order'      => (int) $r->avg_order,
                'last_purchase'  => $r->last_purchase
                    ? Carbon::parse($r->last_purchase)->format('d M Y')
                    : '-',
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  8. PENJUALAN PER KASIR
        // ══════════════════════════════════════════════════════════════════════
        $byCashier = DB::table('sales')
            ->join('users', 'sales.cashier_id', '=', 'users.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                users.id,
                users.name,
                COUNT(sales.id)                             AS total_transactions,
                COALESCE(SUM(sales.total), 0)               AS total_revenue,
                COALESCE(AVG(sales.total), 0)               AS avg_order,
                COUNT(DISTINCT sales.customer_id)           AS unique_customers
            ')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(fn($r) => [
                'id'                 => $r->id,
                'name'               => $r->name,
                'total_transactions' => (int) $r->total_transactions,
                'total_revenue'      => (int) $r->total_revenue,
                'avg_order'          => (int) $r->avg_order,
                'unique_customers'   => (int) $r->unique_customers,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  9. PENJUALAN PER TOKO (super admin)
        // ══════════════════════════════════════════════════════════════════════
        $byStore = [];
        if ($isSuperAdmin) {
            $byStoreQuery = DB::table('sales')
                ->join('stores', 'sales.store_id', '=', 'stores.id')
                ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
                ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
                ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
                ->selectRaw("
                    stores.id,
                    stores.name,
                    stores.code,
                    COUNT(sales.id)                                             AS transactions,
                    COALESCE(SUM(sales.total), 0)                               AS revenue,
                    COALESCE(AVG(sales.total), 0)                               AS avg_order,
                    COUNT(DISTINCT sales.customer_id)                           AS unique_customers,
                    SUM(CASE WHEN sales.customer_id IS NOT NULL THEN 1 ELSE 0 END) AS member_tx
                ")
                ->groupBy('stores.id', 'stores.name', 'stores.code')
                ->orderByDesc('revenue')
                ->get();

            $totalRevStore = $byStoreQuery->sum('revenue');
            $byStore = $byStoreQuery->map(fn($r) => [
                'id'               => $r->id,
                'name'             => $r->name,
                'code'             => $r->code,
                'transactions'     => (int) $r->transactions,
                'revenue'          => (int) $r->revenue,
                'avg_order'        => (int) $r->avg_order,
                'unique_customers' => (int) $r->unique_customers,
                'member_tx'        => (int) $r->member_tx,
                'share_pct'        => $totalRevStore > 0 ? round(($r->revenue / $totalRevStore) * 100, 1) : 0,
            ])->toArray();
        }

        // ══════════════════════════════════════════════════════════════════════
        //  10. PENJUALAN PER SALES PERSON
        // ══════════════════════════════════════════════════════════════════════
        $bySalesPerson = DB::table('sales')
            ->join('sales_people', 'sales.sales_person_id', '=', 'sales_people.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                sales_people.id,
                sales_people.name,
                sales_people.code,
                COUNT(sales.id)                             AS transactions,
                COALESCE(SUM(sales.total), 0)               AS revenue,
                COALESCE(AVG(sales.total), 0)               AS avg_order,
                COUNT(DISTINCT sales.customer_id)           AS unique_customers
            ')
            ->groupBy('sales_people.id', 'sales_people.name', 'sales_people.code')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn($r) => [
                'id'               => $r->id,
                'name'             => $r->name,
                'code'             => $r->code,
                'transactions'     => (int) $r->transactions,
                'revenue'          => (int) $r->revenue,
                'avg_order'        => (int) $r->avg_order,
                'unique_customers' => (int) $r->unique_customers,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  11. PACKAGING ADD-ON TERLARIS
        //      Migration: sale_item_packagings.packaging_material_id
        // ══════════════════════════════════════════════════════════════════════
        $topPackaging = DB::table('sale_item_packagings')
            ->join('sale_items',          'sale_item_packagings.sale_item_id',         '=', 'sale_items.id')
            ->join('sales',               'sale_items.sale_id',                         '=', 'sales.id')
            ->join('packaging_materials', 'sale_item_packagings.packaging_material_id', '=', 'packaging_materials.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                packaging_materials.id,
                packaging_materials.name,
                packaging_materials.code,
                SUM(sale_item_packagings.qty)                   AS qty,
                COALESCE(SUM(sale_item_packagings.subtotal), 0) AS revenue
            ')
            ->groupBy('packaging_materials.id', 'packaging_materials.name', 'packaging_materials.code')
            ->orderByDesc('qty')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'id'      => $r->id,
                'name'    => $r->name,
                'code'    => $r->code,
                'qty'     => (int) $r->qty,
                'revenue' => (int) $r->revenue,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  12. PENJUALAN PER JAM (heatmap)
        //      PostgreSQL: EXTRACT(HOUR FROM sold_at) — bukan HOUR()
        // ══════════════════════════════════════════════════════════════════════
        $byHour = DB::table('sales')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->whereBetween('sold_at', [$dateFrom, $dateTo])
            ->selectRaw("
                EXTRACT(HOUR FROM sold_at)::int     AS hour,
                COUNT(*)                            AS transactions,
                COALESCE(SUM(total), 0)             AS revenue
            ")
            ->groupByRaw('EXTRACT(HOUR FROM sold_at)::int')
            ->orderByRaw('EXTRACT(HOUR FROM sold_at)::int')
            ->get()
            ->keyBy('hour');

        $hourlyData = collect(range(0, 23))->map(fn($h) => [
            'hour'         => $h,
            'label'        => sprintf('%02d:00', $h),
            'transactions' => isset($byHour[$h]) ? (int) $byHour[$h]->transactions : 0,
            'revenue'      => isset($byHour[$h]) ? (int) $byHour[$h]->revenue      : 0,
        ]);

        // ══════════════════════════════════════════════════════════════════════
        //  13. TREN MEMBER vs WALK-IN
        // ══════════════════════════════════════════════════════════════════════
        $memberTrend = DB::table('sales')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->whereBetween('sold_at', [$dateFrom, $dateTo])
            ->selectRaw("
                {$labelExpr}                                                        AS label,
                SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END)            AS member,
                SUM(CASE WHEN customer_id IS NULL     THEN 1 ELSE 0 END)            AS walkin,
                COALESCE(SUM(CASE WHEN customer_id IS NOT NULL THEN total ELSE 0 END), 0) AS member_revenue,
                COALESCE(SUM(CASE WHEN customer_id IS NULL     THEN total ELSE 0 END), 0) AS walkin_revenue
            ")
            ->groupByRaw("{$groupExpr}, {$labelExpr}")
            ->orderByRaw($groupExpr)
            ->get()
            ->map(fn($r) => [
                'label'          => $r->label,
                'member'         => (int) $r->member,
                'walkin'         => (int) $r->walkin,
                'member_revenue' => (int) $r->member_revenue,
                'walkin_revenue' => (int) $r->walkin_revenue,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  14. DAFTAR TRANSAKSI TERBARU (50)
        //      - sold_at          : timestamp, format via Carbon
        //      - subtotal         : bukan subtotal_before_discount
        //      - snapshot names   : cashier_name, customer_name, sales_person_name
        // ══════════════════════════════════════════════════════════════════════
        $recentTransactions = DB::table('sales')
            ->leftJoin('customers',    'sales.customer_id',     '=', 'customers.id')
            ->leftJoin('users',        'sales.cashier_id',      '=', 'users.id')
            ->leftJoin('sales_people', 'sales.sales_person_id', '=', 'sales_people.id')
            ->join('stores',           'sales.store_id',        '=', 'stores.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                sales.sale_number,
                sales.sold_at,
                sales.status,
                sales.subtotal,
                sales.discount_amount,
                sales.total,
                stores.name                                             AS store_name,
                COALESCE(sales.customer_name, customers.name)           AS customer_name,
                customers.tier                                          AS customer_tier,
                COALESCE(sales.cashier_name, users.name)                AS cashier_name,
                COALESCE(sales.sales_person_name, sales_people.name)    AS sales_person_name
            ')
            ->orderByDesc('sales.sold_at')
            ->limit(50)
            ->get()
            ->map(fn($r) => [
                'invoice'       => $r->sale_number,
                'date'          => Carbon::parse($r->sold_at)->format('d M Y'),
                'time'          => Carbon::parse($r->sold_at)->format('H:i'),
                'status'        => $r->status,
                'store'         => $r->store_name,
                'customer'      => $r->customer_name ?? 'Walk-in',
                'customer_tier' => $r->customer_tier,
                'cashier'       => $r->cashier_name  ?? '-',
                'sales_person'  => $r->sales_person_name ?? '-',
                'gross_sales'   => (int) $r->subtotal,
                'discount'      => (int) $r->discount_amount,
                'total'         => (int) $r->total,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  RETURN
        // ══════════════════════════════════════════════════════════════════════
        return Inertia::render('Laporan/Penjualan', [
            'filters' => [
                'store_id'  => $storeId,
                'date_from' => $dateFrom->toDateString(),
                'date_to'   => $dateTo->toDateString(),
                'group_by'  => $groupBy,
                'status'    => $status,
            ],
            'stores'       => $stores,
            'isSuperAdmin' => $isSuperAdmin,

            'summary' => [
                'totalTransactions' => (int) $summary->total_transactions,
                'totalRevenue'      => (int) $summary->total_revenue,
                'grossSales'        => (int) $summary->gross_sales,
                'totalDiscount'     => (int) $summary->total_discount,
                'totalItemsSold'    => (int) $totalItemsSold,
                'avgOrderValue'     => (int) $summary->avg_order_value,
                'uniqueCustomers'   => (int) $summary->unique_customers,
                'activeCashiers'    => (int) $summary->active_cashiers,
                'activeStores'      => (int) $summary->active_stores,
                'completedCount'    => (int) $summary->completed_count,
                'cancelledCount'    => (int) $summary->cancelled_count,
                'refundedCount'     => (int) $summary->refunded_count,
                'memberTx'          => (int) $summary->member_tx,
                'walkinTx'          => (int) $summary->walkin_tx,
                'completionRate'    => $completionRate,
                'memberRate'        => $memberRate,
            ],

            'trendData'          => $trendData,
            'byIntensity'        => $byIntensity,
            'bySize'             => $bySize,
            'byGender'           => $byGender,
            'byVariant'          => $byVariant,
            'topCustomers'       => $topCustomers,
            'byCashier'          => $byCashier,
            'byStore'            => $byStore,
            'bySalesPerson'      => $bySalesPerson,
            'topPackaging'       => $topPackaging,
            'hourlyData'         => $hourlyData,
            'memberTrend'        => $memberTrend,
            'recentTransactions' => $recentTransactions,
        ]);
    }
}
