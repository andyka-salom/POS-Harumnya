<?php

namespace App\Http\Controllers\Laporan;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/**
 * LaporanKeuanganController — PRODUCTION READY
 *
 * Disesuaikan dengan schema migration:
 *   003 — packaging_materials, packaging_categories
 *   004 — variants, intensities, sizes, products, product_recipes
 *   008 — discount_types, discount_usages, sale_discounts
 *   010 — sales, sale_items, sale_item_packagings, sale_payments, sale_returns
 *
 * FIX KRITIS dari versi lama:
 *   [1] byIntensity/bySize/byVariant: gunakan snapshot columns (variant_id_snapshot,
 *       intensity_id_snapshot, size_id_snapshot) agar data made-to-order tidak hilang
 *       saat product_id = NULL
 *   [2] discountAnalysis: hapus referensi ke sale_discounts.discount_type (tidak ada
 *       di migration); gunakan discount_category saja
 *   [3] byPayment: gunakan snapshot columns payment_method_name/payment_method_type
 *       dari sale_payments agar data tidak hilang ketika payment_method_id = NULL
 *   [4] Seluruh kolom harga: decimal(15,2), gross_profit SIGNED
 *   [5] sold_at adalah TIMESTAMP — range filter menggunakan startOfDay/endOfDay
 *   [6] cashier_id di sales adalah bigint (users), bukan UUID
 */
class LaporanKeuanganController extends Controller
{
    public function index(Request $request)
    {
        $user         = auth()->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') ? $user->isSuperAdmin() : false;

        // ── Filter params ─────────────────────────────────────────────────────
        $storeId  = $request->input('store_id', $isSuperAdmin ? null : ($user->default_store_id ?? null));
        $dateFrom = $request->input('date_from', Carbon::now()->startOfMonth()->toDateString());
        $dateTo   = $request->input('date_to', Carbon::now()->toDateString());
        $groupBy  = $request->input('group_by', 'day'); // day | week | month

        // sold_at adalah TIMESTAMP → pakai full day range
        $dateFromDt = Carbon::parse($dateFrom)->startOfDay();
        $dateToDt   = Carbon::parse($dateTo)->endOfDay();

        // ── Daftar toko (dropdown) ────────────────────────────────────────────
        $stores = DB::table('stores')
            ->where('is_active', true)
            ->select('id', 'name', 'code')
            ->orderBy('name')
            ->get();

        // ══════════════════════════════════════════════════════════════════════
        //  1. RINGKASAN KEUANGAN UTAMA
        //  Kolom migration: subtotal, discount_amount, total, cogs_total,
        //  gross_profit, sold_at, cashier_id, customer_id
        //  subtotal_perfume + subtotal_packaging = subtotal
        // ══════════════════════════════════════════════════════════════════════
        $summary = DB::table('sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                COALESCE(SUM(subtotal), 0)                      AS gross_sales,
                COALESCE(SUM(discount_amount), 0)               AS total_discount,
                COALESCE(SUM(total), 0)                         AS total_revenue,
                COALESCE(SUM(cogs_total), 0)                    AS total_cogs,
                COALESCE(SUM(gross_profit), 0)                  AS gross_profit,
                COALESCE(SUM(subtotal_perfume), 0)              AS subtotal_perfume,
                COALESCE(SUM(subtotal_packaging), 0)            AS subtotal_packaging,
                COALESCE(SUM(cogs_perfume), 0)                  AS cogs_perfume,
                COALESCE(SUM(cogs_packaging), 0)                AS cogs_packaging,
                COALESCE(SUM(tax_amount), 0)                    AS total_tax,
                COALESCE(SUM(points_earned), 0)                 AS total_points_earned,
                COALESCE(SUM(points_redeemed), 0)               AS total_points_redeemed,
                COALESCE(SUM(points_redemption_value), 0)       AS total_redemption_value,
                COUNT(*)                                        AS total_transactions,
                COALESCE(AVG(total), 0)                         AS avg_order_value,
                COALESCE(AVG(gross_profit), 0)                  AS avg_profit_per_tx,
                COUNT(DISTINCT customer_id)                     AS unique_customers,
                COUNT(DISTINCT cashier_id)                      AS active_cashiers
            ')
            ->first();

        $grossMarginPct = $summary->total_revenue > 0
            ? round(($summary->gross_profit / $summary->total_revenue) * 100, 2)
            : 0;

        $markupPct = $summary->total_cogs > 0
            ? round(($summary->gross_profit / $summary->total_cogs) * 100, 2)
            : 0;

        $discountRatePct = $summary->gross_sales > 0
            ? round(($summary->total_discount / $summary->gross_sales) * 100, 2)
            : 0;

        // ══════════════════════════════════════════════════════════════════════
        //  2. TREN KEUANGAN (grouped by day / week / month)
        //  sold_at = timestamp → DATE(sold_at) untuk group
        // ══════════════════════════════════════════════════════════════════════
        [$groupExpr, $labelExpr] = $this->groupExpression($groupBy);

        $trendData = DB::table('sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw("
                {$groupExpr}                                    AS period_key,
                {$labelExpr}                                    AS label,
                COALESCE(SUM(subtotal), 0)                      AS gross_sales,
                COALESCE(SUM(discount_amount), 0)               AS discount,
                COALESCE(SUM(total), 0)                         AS revenue,
                COALESCE(SUM(cogs_total), 0)                    AS cogs,
                COALESCE(SUM(gross_profit), 0)                  AS gross_profit,
                COUNT(*)                                        AS transactions,
                COALESCE(AVG(total), 0)                         AS avg_order
            ")
            ->groupByRaw("{$groupExpr}, {$labelExpr}")
            ->orderByRaw($groupExpr)
            ->get()
            ->map(fn ($r) => [
                'label'        => $r->label,
                'gross_sales'  => (float) $r->gross_sales,
                'discount'     => (float) $r->discount,
                'revenue'      => (float) $r->revenue,
                'cogs'         => (float) $r->cogs,
                'gross_profit' => (float) $r->gross_profit,
                'transactions' => (int)   $r->transactions,
                'avg_order'    => (float) $r->avg_order,
                'margin_pct'   => $r->revenue > 0
                    ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  3. BREAKDOWN INTENSITAS
        //
        //  FIX: Gunakan intensity_id_snapshot (bukan JOIN ke products) agar
        //  data made-to-order (product_id = NULL) ikut terhitung.
        //  intensities.code / name diambil via LEFT JOIN.
        // ══════════════════════════════════════════════════════════════════════
        $byIntensity = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('intensities', 'sale_items.intensity_id_snapshot', '=', 'intensities.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->whereNotNull('sale_items.intensity_id_snapshot')
            ->selectRaw('
                sale_items.intensity_id_snapshot                            AS intensity_id,
                COALESCE(intensities.code, sale_items.intensity_code)       AS code,
                COALESCE(intensities.name, sale_items.intensity_code)       AS name,
                SUM(sale_items.qty)                                         AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)                       AS revenue,
                COALESCE(SUM(sale_items.cogs_total), 0)                     AS cogs,
                COALESCE(SUM(sale_items.line_gross_profit), 0)              AS gross_profit
            ')
            ->groupBy(
                'sale_items.intensity_id_snapshot',
                'intensities.code',
                'intensities.name',
                'sale_items.intensity_code'
            )
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($r) => [
                'code'         => $r->code,
                'name'         => $r->name,
                'qty'          => (int)   $r->qty,
                'revenue'      => (float) $r->revenue,
                'cogs'         => (float) $r->cogs,
                'gross_profit' => (float) $r->gross_profit,
                'margin_pct'   => $r->revenue > 0
                    ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  4. BREAKDOWN UKURAN
        //  FIX: Gunakan size_id_snapshot + size_ml snapshot
        // ══════════════════════════════════════════════════════════════════════
        $bySize = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('sizes', 'sale_items.size_id_snapshot', '=', 'sizes.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->whereNotNull('sale_items.size_id_snapshot')
            ->selectRaw('
                sale_items.size_id_snapshot                                 AS size_id,
                COALESCE(sale_items.size_ml, sizes.volume_ml)               AS volume_ml,
                COALESCE(sizes.name, CONCAT(sale_items.size_ml, \'ml\'))    AS name,
                SUM(sale_items.qty)                                         AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)                       AS revenue,
                COALESCE(SUM(sale_items.cogs_total), 0)                     AS cogs,
                COALESCE(SUM(sale_items.line_gross_profit), 0)              AS gross_profit
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
                'volume_ml'    => (int)   $r->volume_ml,
                'name'         => $r->name,
                'qty'          => (int)   $r->qty,
                'revenue'      => (float) $r->revenue,
                'cogs'         => (float) $r->cogs,
                'gross_profit' => (float) $r->gross_profit,
                'margin_pct'   => $r->revenue > 0
                    ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  5. BREAKDOWN VARIAN (top 10 by gross profit)
        //  FIX: Gunakan variant_id_snapshot + snapshot columns
        // ══════════════════════════════════════════════════════════════════════
        $byVariant = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('variants', 'sale_items.variant_id_snapshot', '=', 'variants.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->whereNotNull('sale_items.variant_id_snapshot')
            ->selectRaw('
                sale_items.variant_id_snapshot                                      AS variant_id,
                COALESCE(variants.name, sale_items.variant_name, \'Unknown\')       AS name,
                COALESCE(variants.gender, \'unisex\')                               AS gender,
                SUM(sale_items.qty)                                                 AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)                               AS revenue,
                COALESCE(SUM(sale_items.cogs_total), 0)                             AS cogs,
                COALESCE(SUM(sale_items.line_gross_profit), 0)                      AS gross_profit
            ')
            ->groupBy(
                'sale_items.variant_id_snapshot',
                'variants.name',
                'variants.gender',
                'sale_items.variant_name'
            )
            ->orderByDesc('gross_profit')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'id'           => $r->variant_id,
                'name'         => $r->name,
                'gender'       => $r->gender,
                'qty'          => (int)   $r->qty,
                'revenue'      => (float) $r->revenue,
                'cogs'         => (float) $r->cogs,
                'gross_profit' => (float) $r->gross_profit,
                'margin_pct'   => $r->revenue > 0
                    ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  6. BREAKDOWN PACKAGING
        //  Dari sale_item_packagings → aggregate kontribusi packaging
        // ══════════════════════════════════════════════════════════════════════
        $byPackaging = DB::table('sale_item_packagings')
            ->join('sale_items', 'sale_item_packagings.sale_item_id', '=', 'sale_items.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                sale_item_packagings.packaging_name                         AS name,
                SUM(sale_item_packagings.qty)                               AS qty,
                COALESCE(SUM(sale_item_packagings.subtotal), 0)             AS revenue,
                COALESCE(SUM(sale_item_packagings.cogs_total), 0)           AS cogs,
                COALESCE(SUM(sale_item_packagings.line_gross_profit), 0)    AS gross_profit
            ')
            ->groupBy('sale_item_packagings.packaging_name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'name'         => $r->name,
                'qty'          => (int)   $r->qty,
                'revenue'      => (float) $r->revenue,
                'cogs'         => (float) $r->cogs,
                'gross_profit' => (float) $r->gross_profit,
                'margin_pct'   => $r->revenue > 0
                    ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  7. BREAKDOWN METODE PEMBAYARAN
        //
        //  FIX: Gunakan snapshot columns payment_method_name & payment_method_type
        //  dari sale_payments agar data tidak hilang ketika payment_method_id = NULL
        //  (payment method dihapus setelah transaksi).
        // ══════════════════════════════════════════════════════════════════════
        $byPayment = DB::table('sale_payments')
            ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->where('sale_payments.payment_status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                sale_payments.payment_method_name                           AS name,
                sale_payments.payment_method_type                           AS type,
                COUNT(DISTINCT sales.id)                                    AS transactions,
                COALESCE(SUM(sale_payments.amount), 0)                      AS total_amount,
                COALESCE(SUM(sale_payments.admin_fee), 0)                   AS total_admin_fee
            ')
            ->groupBy(
                'sale_payments.payment_method_name',
                'sale_payments.payment_method_type'
            )
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($r) => [
                'name'            => $r->name,
                'type'            => $r->type,
                'transactions'    => (int)   $r->transactions,
                'amount'          => (float) $r->total_amount,
                'admin_fee'       => (float) $r->total_admin_fee,
                'net_amount'      => (float) ($r->total_amount - $r->total_admin_fee),
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  8. ANALISIS DISKON
        //
        //  FIX: Migration sale_discounts TIDAK memiliki kolom "discount_type".
        //  Yang ada: discount_category, discount_code, discount_name, applied_amount.
        //  Versi lama salah query ke kolom yang tidak exist.
        // ══════════════════════════════════════════════════════════════════════
        $discountAnalysis = DB::table('sale_discounts')
            ->join('sales', 'sale_discounts.sale_id', '=', 'sales.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                sale_discounts.discount_category                            AS category,
                sale_discounts.discount_name                                AS name,
                COUNT(DISTINCT sales.id)                                    AS usage_count,
                COALESCE(SUM(sale_discounts.applied_amount), 0)             AS total_amount
            ')
            ->groupBy(
                'sale_discounts.discount_category',
                'sale_discounts.discount_name'
            )
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($r) => [
                'category'     => $r->category,
                'name'         => $r->name,
                'usage_count'  => (int)   $r->usage_count,
                'total_amount' => (float) $r->total_amount,
            ]);

        // ── Ringkasan diskon per kategori (untuk chart) ───────────────────────
        $discountByCategory = DB::table('sale_discounts')
            ->join('sales', 'sale_discounts.sale_id', '=', 'sales.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                sale_discounts.discount_category                            AS category,
                COUNT(DISTINCT sales.id)                                    AS usage_count,
                COALESCE(SUM(sale_discounts.applied_amount), 0)             AS total_amount
            ')
            ->groupBy('sale_discounts.discount_category')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($r) => [
                'category'     => $r->category,
                'usage_count'  => (int)   $r->usage_count,
                'total_amount' => (float) $r->total_amount,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  9. PERFORMA PER TOKO (super admin only)
        // ══════════════════════════════════════════════════════════════════════
        $byStore = [];
        if ($isSuperAdmin) {
            $byStore = DB::table('sales')
                ->join('stores', 'sales.store_id', '=', 'stores.id')
                ->where('sales.status', 'completed')
                ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
                ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
                ->selectRaw('
                    stores.id,
                    stores.name,
                    stores.code,
                    COUNT(sales.id)                                         AS transactions,
                    COALESCE(SUM(sales.subtotal), 0)                        AS gross_sales,
                    COALESCE(SUM(sales.discount_amount), 0)                 AS discount,
                    COALESCE(SUM(sales.total), 0)                           AS revenue,
                    COALESCE(SUM(sales.cogs_total), 0)                      AS cogs,
                    COALESCE(SUM(sales.gross_profit), 0)                    AS gross_profit,
                    COALESCE(AVG(sales.total), 0)                           AS avg_order,
                    COUNT(DISTINCT sales.customer_id)                       AS unique_customers
                ')
                ->groupBy('stores.id', 'stores.name', 'stores.code')
                ->orderByDesc('gross_profit')
                ->get()
                ->map(fn ($r) => [
                    'id'               => $r->id,
                    'name'             => $r->name,
                    'code'             => $r->code,
                    'transactions'     => (int)   $r->transactions,
                    'gross_sales'      => (float) $r->gross_sales,
                    'discount'         => (float) $r->discount,
                    'revenue'          => (float) $r->revenue,
                    'cogs'             => (float) $r->cogs,
                    'gross_profit'     => (float) $r->gross_profit,
                    'avg_order'        => (float) $r->avg_order,
                    'unique_customers' => (int)   $r->unique_customers,
                    'margin_pct'       => $r->revenue > 0
                        ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
                ])
                ->toArray();
        }

        // ══════════════════════════════════════════════════════════════════════
        //  10. REKAP HARIAN (sparkline)
        // ══════════════════════════════════════════════════════════════════════
        $dailyMargin = DB::table('sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                DATE(sold_at)                                               AS sale_date,
                COALESCE(SUM(total), 0)                                     AS revenue,
                COALESCE(SUM(gross_profit), 0)                              AS gross_profit,
                COALESCE(SUM(cogs_total), 0)                                AS cogs,
                COUNT(*)                                                    AS transactions
            ')
            ->groupByRaw('DATE(sold_at)')
            ->orderByRaw('DATE(sold_at)')
            ->get()
            ->map(fn ($r) => [
                'date'         => Carbon::parse($r->sale_date)->format('d/m'),
                'revenue'      => (float) $r->revenue,
                'gross_profit' => (float) $r->gross_profit,
                'cogs'         => (float) $r->cogs,
                'margin_pct'   => $r->revenue > 0
                    ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
                'transactions' => (int) $r->transactions,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  11. DETAIL TRANSAKSI (50 terbaru)
        //
        //  FIX: Gunakan snapshot columns (cashier_name, customer_name) langsung
        //  dari tabel sales. LEFT JOIN ke customers/users hanya sebagai fallback.
        //  Kolom yang digunakan: subtotal (bukan subtotal_before_discount)
        // ══════════════════════════════════════════════════════════════════════
        $detailTransactions = DB::table('sales')
            ->leftJoin('customers', 'sales.customer_id', '=', 'customers.id')
            ->leftJoin('users', 'sales.cashier_id', '=', 'users.id')
            ->join('stores', 'sales.store_id', '=', 'stores.id')
            ->when($storeId, fn ($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                sales.sale_number,
                sales.sold_at,
                sales.subtotal,
                sales.subtotal_perfume,
                sales.subtotal_packaging,
                sales.discount_amount,
                sales.tax_amount,
                sales.total,
                sales.cogs_total,
                sales.cogs_perfume,
                sales.cogs_packaging,
                sales.gross_profit,
                sales.gross_margin_pct,
                sales.points_earned,
                stores.name                                                 AS store_name,
                COALESCE(sales.customer_name, customers.name)               AS customer_name,
                COALESCE(sales.cashier_name, users.name)                    AS cashier_name,
                COALESCE(sales.sales_person_name, \'-\')                    AS sales_person_name
            ')
            ->orderByDesc('sales.sold_at')
            ->limit(50)
            ->get()
            ->map(fn ($r) => [
                'invoice'             => $r->sale_number,
                'date'                => Carbon::parse($r->sold_at)->format('d M Y'),
                'time'                => Carbon::parse($r->sold_at)->format('H:i'),
                'store'               => $r->store_name,
                'customer'            => $r->customer_name ?? 'Walk-in',
                'cashier'             => $r->cashier_name ?? '-',
                'sales_person'        => $r->sales_person_name,
                'gross_sales'         => (float) $r->subtotal,
                'subtotal_perfume'    => (float) $r->subtotal_perfume,
                'subtotal_packaging'  => (float) $r->subtotal_packaging,
                'discount'            => (float) $r->discount_amount,
                'tax'                 => (float) $r->tax_amount,
                'revenue'             => (float) $r->total,
                'cogs'                => (float) $r->cogs_total,
                'cogs_perfume'        => (float) $r->cogs_perfume,
                'cogs_packaging'      => (float) $r->cogs_packaging,
                'gross_profit'        => (float) $r->gross_profit,
                'margin_pct'          => (float) $r->gross_margin_pct,
                'points_earned'       => (int)   $r->points_earned,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  12. RETURN / REFUND SUMMARY
        // ══════════════════════════════════════════════════════════════════════
        $returnSummary = DB::table('sale_returns')
            ->join('stores', 'sale_returns.store_id', '=', 'stores.id')
            ->when($storeId, fn ($q) => $q->where('sale_returns.store_id', $storeId))
            ->whereIn('sale_returns.status', ['approved', 'completed'])
            ->whereBetween('sale_returns.returned_at', [$dateFromDt, $dateToDt])
            ->selectRaw('
                COUNT(*)                                                    AS total_returns,
                COALESCE(SUM(total_refund), 0)                              AS total_refund_amount,
                COUNT(CASE WHEN return_type = \'refund\' THEN 1 END)        AS refund_count,
                COUNT(CASE WHEN return_type = \'exchange\' THEN 1 END)      AS exchange_count
            ')
            ->first();

        // ══════════════════════════════════════════════════════════════════════
        //  RETURN
        // ══════════════════════════════════════════════════════════════════════
        return Inertia::render('Dashboard/Laporan/Keuangan', [
            'filters' => [
                'store_id'  => $storeId,
                'date_from' => $dateFromDt->toDateString(),
                'date_to'   => $dateToDt->toDateString(),
                'group_by'  => $groupBy,
            ],
            'stores'       => $stores,
            'isSuperAdmin' => $isSuperAdmin,

            'summary' => [
                // P&L
                'grossSales'          => (float) $summary->gross_sales,
                'totalDiscount'       => (float) $summary->total_discount,
                'totalRevenue'        => (float) $summary->total_revenue,
                'totalCogs'           => (float) $summary->total_cogs,
                'grossProfit'         => (float) $summary->gross_profit,
                'grossMarginPct'      => $grossMarginPct,
                'markupPct'           => $markupPct,
                'discountRatePct'     => $discountRatePct,
                // Breakdown P&L
                'subtotalPerfume'     => (float) $summary->subtotal_perfume,
                'subtotalPackaging'   => (float) $summary->subtotal_packaging,
                'cogsPerfume'         => (float) $summary->cogs_perfume,
                'cogsPackaging'       => (float) $summary->cogs_packaging,
                'totalTax'            => (float) $summary->total_tax,
                // Loyalty
                'totalPointsEarned'   => (int)   $summary->total_points_earned,
                'totalPointsRedeemed' => (int)   $summary->total_points_redeemed,
                'totalRedemptionValue'=> (float) $summary->total_redemption_value,
                // Ops
                'totalTransactions'   => (int)   $summary->total_transactions,
                'avgOrderValue'       => (float) $summary->avg_order_value,
                'avgProfitPerTx'      => (float) $summary->avg_profit_per_tx,
                'uniqueCustomers'     => (int)   $summary->unique_customers,
                'activeCashiers'      => (int)   $summary->active_cashiers,
                // Returns
                'totalReturns'        => (int)   ($returnSummary->total_returns ?? 0),
                'totalRefundAmount'   => (float) ($returnSummary->total_refund_amount ?? 0),
            ],

            'trendData'           => $trendData,
            'dailyMargin'         => $dailyMargin,
            'byIntensity'         => $byIntensity,
            'bySize'              => $bySize,
            'byVariant'           => $byVariant,
            'byPackaging'         => $byPackaging,
            'byPayment'           => $byPayment,
            'byStore'             => $byStore,
            'discountAnalysis'    => $discountAnalysis,
            'discountByCategory'  => $discountByCategory,
            'detailTransactions'  => $detailTransactions,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Kembalikan [groupExpr, labelExpr] sesuai driver DB.
     * Mendukung MySQL/MariaDB dan PostgreSQL.
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
