<?php

namespace App\Http\Controllers\Laporan;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/**
 * LaporanPenjualanController — PRODUCTION READY
 *
 * FIX KRITIS dari versi lama:
 *   [1] byVariant / byIntensity / bySize / byGender:
 *       INNER JOIN ke products → data made-to-order (product_id=NULL) hilang.
 *       Fix: gunakan snapshot columns (variant_id_snapshot, intensity_id_snapshot,
 *       size_id_snapshot, variant_name, intensity_code, size_ml) di sale_items.
 *
 *   [2] topPackaging: INNER JOIN ke packaging_materials → data hilang jika
 *       packaging dihapus (packaging_material_id=NULL).
 *       Fix: gunakan snapshot packaging_name + packaging_code.
 *
 *   [3] byCashier: INNER JOIN ke users → transaksi dengan cashier yang sudah
 *       dihapus tidak masuk laporan.
 *       Fix: LEFT JOIN + gunakan snapshot cashier_name dari sales.
 *
 *   [4] groupExpr / labelExpr: hardcoded PostgreSQL saja.
 *       Fix: helper groupExpression() yang support MySQL & PostgreSQL.
 *
 *   [5] recentTransactions: tambah total_items_sold per transaksi
 *       (dihitung dari sale_items).
 *
 *   [6] byGender: ambil dari snapshot variant_id_snapshot + variants.gender.
 *       Jika variant sudah dihapus tapi snapshot ada, data tetap masuk
 *       via LEFT JOIN + COALESCE.
 *
 *   [7] Semua kolom harga di-cast ke float (decimal 15,2), bukan int.
 */
class LaporanPenjualanController extends Controller
{
    public function index(Request $request)
    {
        $user         = auth()->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') ? $user->isSuperAdmin() : false;

        // ── Filter params ─────────────────────────────────────────────────────
        $storeId  = $request->input('store_id', $isSuperAdmin ? null : ($user->default_store_id ?? null));
        $dateFrom = $request->input('date_from', Carbon::now()->startOfMonth()->toDateString());
        $dateTo   = $request->input('date_to', Carbon::now()->toDateString());
        $groupBy  = $request->input('group_by', 'day');       // day | week | month
        $status   = $request->input('status', 'completed');   // completed | all | cancelled | refunded

        // sold_at adalah TIMESTAMP → pakai full day range
        $dateFromDt = Carbon::parse($dateFrom)->startOfDay();
        $dateToDt   = Carbon::parse($dateTo)->endOfDay();

        // ── Daftar toko (dropdown) ────────────────────────────────────────────
        $stores = DB::table('stores')
            ->where('is_active', true)
            ->select('id', 'name', 'code')
            ->orderBy('name')
            ->get();

        // ── DB expressions per driver ─────────────────────────────────────────
        [$groupExpr, $labelExpr] = $this->groupExpression($groupBy);

        // ── Reusable filter closures ──────────────────────────────────────────
        $filterStore  = fn ($q) => $q->when($storeId, fn ($q2) => $q2->where('sales.store_id', $storeId));
        $filterStatus = fn ($q) => $q->when($status !== 'all', fn ($q2) => $q2->where('sales.status', $status));

        // ══════════════════════════════════════════════════════════════════════
        //  1. RINGKASAN PENJUALAN
        //  Kolom migration: sold_at (timestamp), subtotal, discount_amount, total
        //  cashier_id = bigint (users), customer_id = UUID (customers)
        // ══════════════════════════════════════════════════════════════════════
        $summary = DB::table('sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->whereBetween('sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw("
                COUNT(*)                                                        AS total_transactions,
                COALESCE(SUM(total), 0)                                         AS total_revenue,
                COALESCE(SUM(subtotal), 0)                                      AS gross_sales,
                COALESCE(SUM(discount_amount), 0)                               AS total_discount,
                COALESCE(AVG(total), 0)                                         AS avg_order_value,
                COUNT(DISTINCT customer_id)                                     AS unique_customers,
                COUNT(DISTINCT cashier_id)                                      AS active_cashiers,
                COUNT(DISTINCT store_id)                                        AS active_stores,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)           AS completed_count,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)           AS cancelled_count,
                SUM(CASE WHEN status = 'refunded'  THEN 1 ELSE 0 END)           AS refunded_count,
                SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END)        AS member_tx,
                SUM(CASE WHEN customer_id IS NULL     THEN 1 ELSE 0 END)        AS walkin_tx
            ")
            ->first();

        // total_items_sold: tidak ada di sales header → hitung dari sale_items
        $totalItemsSold = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
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
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->whereBetween('sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw("
                {$groupExpr}                                                    AS period_key,
                {$labelExpr}                                                    AS label,
                COUNT(*)                                                        AS transactions,
                COALESCE(SUM(total), 0)                                         AS revenue,
                COALESCE(SUM(subtotal), 0)                                      AS gross_sales,
                COALESCE(SUM(discount_amount), 0)                               AS discount,
                COALESCE(AVG(total), 0)                                         AS avg_order,
                COUNT(DISTINCT customer_id)                                     AS unique_customers,
                SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END)        AS member_tx
            ")
            ->groupByRaw("{$groupExpr}, {$labelExpr}")
            ->orderByRaw($groupExpr)
            ->get()
            ->map(fn ($r) => [
                'label'            => $r->label,
                'transactions'     => (int)   $r->transactions,
                'revenue'          => (float) $r->revenue,
                'gross_sales'      => (float) $r->gross_sales,
                'discount'         => (float) $r->discount,
                'avg_order'        => (float) $r->avg_order,
                'unique_customers' => (int)   $r->unique_customers,
                'member_tx'        => (int)   $r->member_tx,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  3. PENJUALAN PER VARIAN — Top 15
        //
        //  FIX: Gunakan variant_id_snapshot + LEFT JOIN ke variants.
        //  Produk made-to-order (product_id=NULL) tetap masuk via snapshot.
        // ══════════════════════════════════════════════════════════════════════
        $byVariant = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('variants', 'sale_items.variant_id_snapshot', '=', 'variants.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->whereNotNull('sale_items.variant_id_snapshot')
            ->selectRaw('
                sale_items.variant_id_snapshot                                      AS variant_id,
                COALESCE(variants.name, sale_items.variant_name, \'Unknown\')       AS name,
                COALESCE(variants.gender, \'unisex\')                               AS gender,
                SUM(sale_items.qty)                                                 AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)                               AS revenue,
                COALESCE(AVG(sale_items.unit_price), 0)                             AS avg_price,
                COUNT(DISTINCT sales.id)                                            AS tx_count
            ')
            ->groupBy(
                'sale_items.variant_id_snapshot',
                'variants.name',
                'variants.gender',
                'sale_items.variant_name'
            )
            ->orderByDesc('qty')
            ->limit(15)
            ->get()
            ->map(fn ($r) => [
                'id'        => $r->variant_id,
                'name'      => $r->name,
                'gender'    => $r->gender,
                'qty'       => (int)   $r->qty,
                'revenue'   => (float) $r->revenue,
                'avg_price' => (float) $r->avg_price,
                'tx_count'  => (int)   $r->tx_count,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  4. PENJUALAN PER INTENSITAS
        //
        //  FIX: Gunakan intensity_id_snapshot + intensity_code snapshot.
        // ══════════════════════════════════════════════════════════════════════
        $byIntensityRaw = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('intensities', 'sale_items.intensity_id_snapshot', '=', 'intensities.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->whereNotNull('sale_items.intensity_id_snapshot')
            ->selectRaw('
                sale_items.intensity_id_snapshot                                AS intensity_id,
                COALESCE(intensities.code, sale_items.intensity_code)           AS code,
                COALESCE(intensities.name, sale_items.intensity_code)           AS name,
                SUM(sale_items.qty)                                             AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)                           AS revenue,
                COUNT(DISTINCT sales.id)                                        AS tx_count
            ')
            ->groupBy(
                'sale_items.intensity_id_snapshot',
                'intensities.code',
                'intensities.name',
                'sale_items.intensity_code'
            )
            ->orderByDesc('qty')
            ->get();

        $totalQtyInt = $byIntensityRaw->sum('qty');
        $byIntensity = $byIntensityRaw->map(fn ($r) => [
            'code'     => $r->code,
            'name'     => $r->name,
            'qty'      => (int)   $r->qty,
            'revenue'  => (float) $r->revenue,
            'tx_count' => (int)   $r->tx_count,
            'pct'      => $totalQtyInt > 0 ? round(($r->qty / $totalQtyInt) * 100, 1) : 0,
        ]);

        // ══════════════════════════════════════════════════════════════════════
        //  5. PENJUALAN PER UKURAN
        //
        //  FIX: Gunakan size_id_snapshot + size_ml snapshot.
        // ══════════════════════════════════════════════════════════════════════
        $bySize = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('sizes', 'sale_items.size_id_snapshot', '=', 'sizes.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->whereNotNull('sale_items.size_id_snapshot')
            ->selectRaw('
                sale_items.size_id_snapshot                                     AS size_id,
                COALESCE(sale_items.size_ml, sizes.volume_ml)                   AS volume_ml,
                COALESCE(sizes.name, CONCAT(sale_items.size_ml, \'ml\'))        AS name,
                SUM(sale_items.qty)                                             AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)                           AS revenue
            ')
            ->groupBy(
                'sale_items.size_id_snapshot',
                'sale_items.size_ml',
                'sizes.volume_ml',
                'sizes.name'
            )
            ->orderByDesc('qty')
            ->get()
            ->map(fn ($r) => [
                'volume_ml' => (int)   $r->volume_ml,
                'name'      => $r->name,
                'qty'       => (int)   $r->qty,
                'revenue'   => (float) $r->revenue,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  6. PENJUALAN PER GENDER
        //
        //  FIX: Gunakan variant_id_snapshot → LEFT JOIN ke variants untuk gender.
        //  Jika variant dihapus, gender diambil dari snapshot tidak ada di
        //  sale_items (gender tidak di-snapshot), maka gunakan 'unknown' sebagai
        //  fallback daripada kehilangan data.
        // ══════════════════════════════════════════════════════════════════════
        $byGender = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('variants', 'sale_items.variant_id_snapshot', '=', 'variants.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                COALESCE(variants.gender, \'unisex\')    AS gender,
                SUM(sale_items.qty)                     AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)   AS revenue,
                COUNT(DISTINCT sales.id)                AS tx_count
            ')
            ->groupByRaw('COALESCE(variants.gender, \'unisex\')')
            ->orderByDesc('qty')
            ->get()
            ->map(fn ($r) => [
                'gender'   => $r->gender,
                'qty'      => (int)   $r->qty,
                'revenue'  => (float) $r->revenue,
                'tx_count' => (int)   $r->tx_count,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  7. TOP PELANGGAN
        //  Migration: customers.points (saldo aktif), customers.tier
        // ══════════════════════════════════════════════════════════════════════
        $topCustomers = DB::table('sales')
            ->join('customers', 'sales.customer_id', '=', 'customers.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                customers.id,
                customers.name,
                customers.phone,
                customers.tier,
                customers.points                        AS current_points,
                COUNT(sales.id)                         AS total_orders,
                COALESCE(SUM(sales.total), 0)           AS total_spending,
                COALESCE(AVG(sales.total), 0)           AS avg_order,
                MAX(DATE(sales.sold_at))                AS last_purchase
            ')
            ->groupBy(
                'customers.id',
                'customers.name',
                'customers.phone',
                'customers.tier',
                'customers.points'
            )
            ->orderByDesc('total_spending')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'id'             => $r->id,
                'name'           => $r->name,
                'phone'          => $r->phone,
                'tier'           => $r->tier,
                'current_points' => (int)   $r->current_points,
                'total_orders'   => (int)   $r->total_orders,
                'total_spending' => (float) $r->total_spending,
                'avg_order'      => (float) $r->avg_order,
                'last_purchase'  => $r->last_purchase
                    ? Carbon::parse($r->last_purchase)->format('d M Y')
                    : '-',
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  8. PENJUALAN PER KASIR
        //
        //  FIX: sales.cashier_id = bigint (FK ke users). Gunakan LEFT JOIN agar
        //  transaksi dengan kasir yang sudah dihapus tetap masuk. Gunakan
        //  snapshot cashier_name dari sales sebagai fallback nama.
        // ══════════════════════════════════════════════════════════════════════
        $byCashier = DB::table('sales')
            ->leftJoin('users', 'sales.cashier_id', '=', 'users.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->whereNotNull('sales.cashier_id')
            ->selectRaw('
                sales.cashier_id,
                COALESCE(sales.cashier_name, users.name, \'(Kasir Dihapus)\')  AS name,
                COUNT(sales.id)                                                 AS total_transactions,
                COALESCE(SUM(sales.total), 0)                                   AS total_revenue,
                COALESCE(AVG(sales.total), 0)                                   AS avg_order,
                COUNT(DISTINCT sales.customer_id)                               AS unique_customers
            ')
            ->groupBy('sales.cashier_id', 'users.name', 'sales.cashier_name')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(fn ($r) => [
                'id'                 => $r->cashier_id,
                'name'               => $r->name,
                'total_transactions' => (int)   $r->total_transactions,
                'total_revenue'      => (float) $r->total_revenue,
                'avg_order'          => (float) $r->avg_order,
                'unique_customers'   => (int)   $r->unique_customers,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  9. PENJUALAN PER TOKO (super admin)
        // ══════════════════════════════════════════════════════════════════════
        $byStore = [];
        if ($isSuperAdmin) {
            $byStoreRaw = DB::table('sales')
                ->join('stores', 'sales.store_id', '=', 'stores.id')
                ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
                ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
                ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
                ->selectRaw("
                    stores.id,
                    stores.name,
                    stores.code,
                    COUNT(sales.id)                                                 AS transactions,
                    COALESCE(SUM(sales.total), 0)                                   AS revenue,
                    COALESCE(AVG(sales.total), 0)                                   AS avg_order,
                    COUNT(DISTINCT sales.customer_id)                               AS unique_customers,
                    SUM(CASE WHEN sales.customer_id IS NOT NULL THEN 1 ELSE 0 END)  AS member_tx
                ")
                ->groupBy('stores.id', 'stores.name', 'stores.code')
                ->orderByDesc('revenue')
                ->get();

            $totalRevStore = $byStoreRaw->sum('revenue');
            $byStore = $byStoreRaw->map(fn ($r) => [
                'id'               => $r->id,
                'name'             => $r->name,
                'code'             => $r->code,
                'transactions'     => (int)   $r->transactions,
                'revenue'          => (float) $r->revenue,
                'avg_order'        => (float) $r->avg_order,
                'unique_customers' => (int)   $r->unique_customers,
                'member_tx'        => (int)   $r->member_tx,
                'share_pct'        => $totalRevStore > 0
                    ? round(($r->revenue / $totalRevStore) * 100, 1) : 0,
            ])->toArray();
        }

        // ══════════════════════════════════════════════════════════════════════
        //  10. PENJUALAN PER SALES PERSON
        //  sales.sales_person_id = UUID, FK ke sales_people
        //  Gunakan snapshot sales_person_name sebagai fallback.
        // ══════════════════════════════════════════════════════════════════════
        $bySalesPerson = DB::table('sales')
            ->join('sales_people', 'sales.sales_person_id', '=', 'sales_people.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                sales_people.id,
                COALESCE(sales.sales_person_name, sales_people.name)    AS name,
                sales_people.code,
                COUNT(sales.id)                                         AS transactions,
                COALESCE(SUM(sales.total), 0)                           AS revenue,
                COALESCE(AVG(sales.total), 0)                           AS avg_order,
                COUNT(DISTINCT sales.customer_id)                       AS unique_customers
            ')
            ->groupBy(
                'sales_people.id',
                'sales_people.name',
                'sales_people.code',
                'sales.sales_person_name'
            )
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($r) => [
                'id'               => $r->id,
                'name'             => $r->name,
                'code'             => $r->code,
                'transactions'     => (int)   $r->transactions,
                'revenue'          => (float) $r->revenue,
                'avg_order'        => (float) $r->avg_order,
                'unique_customers' => (int)   $r->unique_customers,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  11. PACKAGING ADD-ON TERLARIS
        //
        //  FIX: Gunakan snapshot packaging_name + packaging_code dari
        //  sale_item_packagings agar data tidak hilang jika packaging dihapus.
        //  LEFT JOIN ke packaging_materials hanya untuk fallback.
        // ══════════════════════════════════════════════════════════════════════
        $topPackaging = DB::table('sale_item_packagings')
            ->join('sale_items', 'sale_item_packagings.sale_item_id', '=', 'sale_items.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('packaging_materials', 'sale_item_packagings.packaging_material_id', '=', 'packaging_materials.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                sale_item_packagings.packaging_name                             AS name,
                COALESCE(sale_item_packagings.packaging_code,
                         packaging_materials.code)                              AS code,
                SUM(sale_item_packagings.qty)                                   AS qty,
                COALESCE(SUM(sale_item_packagings.subtotal), 0)                 AS revenue
            ')
            ->groupBy(
                'sale_item_packagings.packaging_name',
                'sale_item_packagings.packaging_code',
                'packaging_materials.code'
            )
            ->orderByDesc('qty')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'name'    => $r->name,
                'code'    => $r->code,
                'qty'     => (int)   $r->qty,
                'revenue' => (float) $r->revenue,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  12. PENJUALAN PER JAM (heatmap)
        //  MySQL: HOUR(sold_at), PostgreSQL: EXTRACT(HOUR FROM sold_at)::int
        // ══════════════════════════════════════════════════════════════════════
        $driver       = DB::getDriverName();
        $hourExpr     = $driver === 'pgsql'
            ? 'EXTRACT(HOUR FROM sold_at)::int'
            : 'HOUR(sold_at)';
        $hourGroupBy  = $driver === 'pgsql'
            ? 'EXTRACT(HOUR FROM sold_at)::int'
            : 'HOUR(sold_at)';

        $byHourRaw = DB::table('sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->whereBetween('sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw("
                {$hourExpr}             AS hour,
                COUNT(*)                AS transactions,
                COALESCE(SUM(total), 0) AS revenue
            ")
            ->groupByRaw($hourGroupBy)
            ->orderByRaw($hourGroupBy)
            ->get()
            ->keyBy('hour');

        $hourlyData = collect(range(0, 23))->map(fn ($h) => [
            'hour'         => $h,
            'label'        => sprintf('%02d:00', $h),
            'transactions' => isset($byHourRaw[$h]) ? (int) $byHourRaw[$h]->transactions : 0,
            'revenue'      => isset($byHourRaw[$h]) ? (float) $byHourRaw[$h]->revenue    : 0,
        ]);

        // ══════════════════════════════════════════════════════════════════════
        //  13. TREN MEMBER vs WALK-IN
        // ══════════════════════════════════════════════════════════════════════
        $memberTrend = DB::table('sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->whereBetween('sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw("
                {$groupExpr}                                                            AS period_key,
                {$labelExpr}                                                            AS label,
                SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END)                AS member,
                SUM(CASE WHEN customer_id IS NULL     THEN 1 ELSE 0 END)                AS walkin,
                COALESCE(SUM(CASE WHEN customer_id IS NOT NULL THEN total ELSE 0 END), 0) AS member_revenue,
                COALESCE(SUM(CASE WHEN customer_id IS NULL     THEN total ELSE 0 END), 0) AS walkin_revenue
            ")
            ->groupByRaw("{$groupExpr}, {$labelExpr}")
            ->orderByRaw($groupExpr)
            ->get()
            ->map(fn ($r) => [
                'label'          => $r->label,
                'member'         => (int)   $r->member,
                'walkin'         => (int)   $r->walkin,
                'member_revenue' => (float) $r->member_revenue,
                'walkin_revenue' => (float) $r->walkin_revenue,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  14. DAFTAR TRANSAKSI TERBARU (50)
        //
        //  FIX:
        //    - Gunakan snapshot cashier_name, customer_name, sales_person_name
        //    - Tambah total_items_sold per transaksi via subquery
        //    - Kolom migration: subtotal (bukan subtotal_before_discount)
        //    - sold_at = timestamp → format via Carbon
        // ══════════════════════════════════════════════════════════════════════
        $recentTransactions = DB::table('sales')
            ->leftJoin('customers',    'sales.customer_id',     '=', 'customers.id')
            ->leftJoin('users',        'sales.cashier_id',      '=', 'users.id')
            ->leftJoin('sales_people', 'sales.sales_person_id', '=', 'sales_people.id')
            ->join('stores',           'sales.store_id',        '=', 'stores.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->when($status !== 'all', fn ($q) => $q->where('sales.status', $status))
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                sales.id                                                        AS sale_id,
                sales.sale_number,
                sales.sold_at,
                sales.status,
                sales.subtotal,
                sales.discount_amount,
                sales.total,
                stores.name                                                     AS store_name,
                COALESCE(sales.customer_name, customers.name)                   AS customer_name,
                customers.tier                                                  AS customer_tier,
                COALESCE(sales.cashier_name, users.name)                        AS cashier_name,
                COALESCE(sales.sales_person_name, sales_people.name)            AS sales_person_name
            ')
            ->orderByDesc('sales.sold_at')
            ->limit(50)
            ->get();

        // Hitung total items per transaksi dalam satu query (lebih efisien dari N+1)
        $saleIds        = $recentTransactions->pluck('sale_id');
        $itemsPerSale   = DB::table('sale_items')
            ->whereIn('sale_id', $saleIds)
            ->selectRaw('sale_id, SUM(qty) AS total_qty')
            ->groupBy('sale_id')
            ->pluck('total_qty', 'sale_id');

        $recentTransactions = $recentTransactions->map(fn ($r) => [
            'invoice'        => $r->sale_number,
            'date'           => Carbon::parse($r->sold_at)->format('d M Y'),
            'time'           => Carbon::parse($r->sold_at)->format('H:i'),
            'status'         => $r->status,
            'store'          => $r->store_name,
            'customer'       => $r->customer_name ?? 'Walk-in',
            'customer_tier'  => $r->customer_tier,
            'cashier'        => $r->cashier_name  ?? '-',
            'sales_person'   => $r->sales_person_name ?? '-',
            'total_items'    => (int) ($itemsPerSale[$r->sale_id] ?? 0),
            'gross_sales'    => (float) $r->subtotal,
            'discount'       => (float) $r->discount_amount,
            'total'          => (float) $r->total,
        ]);

        // ══════════════════════════════════════════════════════════════════════
        //  RETURN
        // ══════════════════════════════════════════════════════════════════════
        return Inertia::render('Dashboard/Laporan/Penjualan', [
            'filters' => [
                'store_id'  => $storeId,
                'date_from' => $dateFromDt->toDateString(),
                'date_to'   => $dateToDt->toDateString(),
                'group_by'  => $groupBy,
                'status'    => $status,
            ],
            'stores'       => $stores,
            'isSuperAdmin' => $isSuperAdmin,

            'summary' => [
                'totalTransactions' => (int)   $summary->total_transactions,
                'totalRevenue'      => (float) $summary->total_revenue,
                'grossSales'        => (float) $summary->gross_sales,
                'totalDiscount'     => (float) $summary->total_discount,
                'totalItemsSold'    => (int)   $totalItemsSold,
                'avgOrderValue'     => (float) $summary->avg_order_value,
                'uniqueCustomers'   => (int)   $summary->unique_customers,
                'activeCashiers'    => (int)   $summary->active_cashiers,
                'activeStores'      => (int)   $summary->active_stores,
                'completedCount'    => (int)   $summary->completed_count,
                'cancelledCount'    => (int)   $summary->cancelled_count,
                'refundedCount'     => (int)   $summary->refunded_count,
                'memberTx'          => (int)   $summary->member_tx,
                'walkinTx'          => (int)   $summary->walkin_tx,
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

    // ── Helper ────────────────────────────────────────────────────────────────

    /**
     * Kembalikan [groupExpr, labelExpr] sesuai driver DB.
     * Support MySQL/MariaDB dan PostgreSQL.
     */
    private function groupExpression(string $groupBy): array
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            return match ($groupBy) {
                'week'  => [
                    "TO_CHAR(DATE_TRUNC('week', sold_at), 'IYYY-IW')",
                    "CONCAT('Mg ', EXTRACT(WEEK FROM sold_at)::int)",
                ],
                'month' => [
                    "TO_CHAR(DATE_TRUNC('month', sold_at), 'YYYY-MM')",
                    "TO_CHAR(sold_at, 'Mon YYYY')",
                ],
                default => [
                    "DATE(sold_at)::text",
                    "TO_CHAR(sold_at, 'DD Mon')",
                ],
            };
        }

        // MySQL / MariaDB (default)
        return match ($groupBy) {
            'week'  => [
                "DATE_FORMAT(sold_at, '%x-W%v')",
                "CONCAT('Mg ', WEEK(sold_at))",
            ],
            'month' => [
                "DATE_FORMAT(sold_at, '%Y-%m')",
                "DATE_FORMAT(sold_at, '%b %Y')",
            ],
            default => [
                "DATE(sold_at)",
                "DATE_FORMAT(sold_at, '%d %b')",
            ],
        };
    }
}
