<?php

namespace App\Http\Controllers\Laporan;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class LaporanKeuanganController extends Controller
{
    public function index(Request $request)
    {
        $user         = auth()->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') ? $user->isSuperAdmin() : false;

        // ── Filter params ─────────────────────────────────────────────────────
        $storeId  = $request->input('store_id', $isSuperAdmin ? null : ($user->default_store_id ?? null));
        $dateFrom = $request->input('date_from', Carbon::now()->startOfMonth()->toDateString());
        $dateTo   = $request->input('date_to',   Carbon::now()->toDateString());
        $groupBy  = $request->input('group_by', 'day'); // day | week | month

        // sold_at adalah timestamp → gunakan Carbon untuk range yang benar
        $dateFrom = Carbon::parse($dateFrom)->startOfDay();
        $dateTo   = Carbon::parse($dateTo)->endOfDay();

        // ── Daftar toko (untuk dropdown) ──────────────────────────────────────
        $stores = DB::table('stores')
            ->where('is_active', true)
            ->select('id', 'name', 'code')
            ->orderBy('name')
            ->get();

        // ══════════════════════════════════════════════════════════════════════
        //  1. RINGKASAN KEUANGAN UTAMA
        //
        //  Migration sales:
        //    - sold_at (timestamp)          ← bukan sale_date
        //    - subtotal                     ← bukan subtotal_before_discount
        //    - discount_amount              ✓
        //    - total                        ✓
        //    - cogs_total                   ✓
        //    - gross_profit                 ✓
        //    - cashier_id / customer_id     ✓
        // ══════════════════════════════════════════════════════════════════════
        $summary = DB::table('sales')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                COALESCE(SUM(total), 0)                     AS total_revenue,
                COALESCE(SUM(cogs_total), 0)                AS total_cogs,
                COALESCE(SUM(gross_profit), 0)              AS gross_profit,
                COALESCE(SUM(discount_amount), 0)           AS total_discount,
                COALESCE(SUM(subtotal), 0)                  AS gross_sales,
                COUNT(*)                                    AS total_transactions,
                COALESCE(AVG(total), 0)                     AS avg_order_value,
                COALESCE(AVG(gross_profit), 0)              AS avg_profit_per_tx,
                COUNT(DISTINCT customer_id)                 AS unique_customers,
                COUNT(DISTINCT cashier_id)                  AS active_cashiers
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
        //     Gunakan sold_at (timestamp) → DATE(sold_at), WEEK(sold_at), dll.
        // ══════════════════════════════════════════════════════════════════════
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

        $trendData = DB::table('sales')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$dateFrom, $dateTo])
            ->selectRaw("
                {$groupExpr}                                AS period_key,
                {$labelExpr}                                AS label,
                COALESCE(SUM(total), 0)                     AS revenue,
                COALESCE(SUM(cogs_total), 0)                AS cogs,
                COALESCE(SUM(gross_profit), 0)              AS gross_profit,
                COALESCE(SUM(discount_amount), 0)           AS discount,
                COUNT(*)                                    AS transactions,
                COALESCE(AVG(total), 0)                     AS avg_order
            ")
            ->groupByRaw($groupExpr . ', ' . $labelExpr)
            ->orderByRaw($groupExpr)
            ->get()
            ->map(fn($r) => [
                'label'        => $r->label,
                'revenue'      => (int) $r->revenue,
                'cogs'         => (int) $r->cogs,
                'gross_profit' => (int) $r->gross_profit,
                'discount'     => (int) $r->discount,
                'transactions' => (int) $r->transactions,
                'avg_order'    => (int) $r->avg_order,
                'margin_pct'   => $r->revenue > 0 ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  3. BREAKDOWN INTENSITAS
        // ══════════════════════════════════════════════════════════════════════
        $byIntensity = DB::table('sale_items')
            ->join('sales',       'sale_items.sale_id',    '=', 'sales.id')
            ->join('products',    'sale_items.product_id', '=', 'products.id')
            ->join('intensities', 'products.intensity_id', '=', 'intensities.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                intensities.id,
                intensities.code,
                intensities.name,
                SUM(sale_items.qty)                                 AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)               AS revenue,
                COALESCE(SUM(sale_items.cogs_total), 0)             AS cogs,
                COALESCE(SUM(sale_items.line_gross_profit), 0)      AS gross_profit
            ')
            ->groupBy('intensities.id', 'intensities.code', 'intensities.name')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn($r) => [
                'code'         => $r->code,
                'name'         => $r->name,
                'qty'          => (int) $r->qty,
                'revenue'      => (int) $r->revenue,
                'cogs'         => (int) $r->cogs,
                'gross_profit' => (int) $r->gross_profit,
                'margin_pct'   => $r->revenue > 0 ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  4. BREAKDOWN UKURAN
        // ══════════════════════════════════════════════════════════════════════
        $bySize = DB::table('sale_items')
            ->join('sales',    'sale_items.sale_id',    '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sizes',    'products.size_id',      '=', 'sizes.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                sizes.volume_ml,
                sizes.name,
                SUM(sale_items.qty)                                 AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)               AS revenue,
                COALESCE(SUM(sale_items.cogs_total), 0)             AS cogs,
                COALESCE(SUM(sale_items.line_gross_profit), 0)      AS gross_profit
            ')
            ->groupBy('sizes.id', 'sizes.volume_ml', 'sizes.name')
            ->orderByDesc('qty')
            ->get()
            ->map(fn($r) => [
                'volume_ml'    => (int) $r->volume_ml,
                'name'         => $r->name,
                'qty'          => (int) $r->qty,
                'revenue'      => (int) $r->revenue,
                'cogs'         => (int) $r->cogs,
                'gross_profit' => (int) $r->gross_profit,
                'margin_pct'   => $r->revenue > 0 ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  5. BREAKDOWN PER VARIAN (top 10)
        // ══════════════════════════════════════════════════════════════════════
        $byVariant = DB::table('sale_items')
            ->join('sales',    'sale_items.sale_id',    '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('variants', 'products.variant_id',   '=', 'variants.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                variants.id,
                variants.name,
                variants.gender,
                SUM(sale_items.qty)                                 AS qty,
                COALESCE(SUM(sale_items.subtotal), 0)               AS revenue,
                COALESCE(SUM(sale_items.cogs_total), 0)             AS cogs,
                COALESCE(SUM(sale_items.line_gross_profit), 0)      AS gross_profit
            ')
            ->groupBy('variants.id', 'variants.name', 'variants.gender')
            ->orderByDesc('gross_profit')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'id'           => $r->id,
                'name'         => $r->name,
                'gender'       => $r->gender,
                'qty'          => (int) $r->qty,
                'revenue'      => (int) $r->revenue,
                'cogs'         => (int) $r->cogs,
                'gross_profit' => (int) $r->gross_profit,
                'margin_pct'   => $r->revenue > 0 ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  6. BREAKDOWN METODE PEMBAYARAN
        // ══════════════════════════════════════════════════════════════════════
        $byPayment = DB::table('sale_payments')
            ->join('sales',           'sale_payments.sale_id',           '=', 'sales.id')
            ->join('payment_methods', 'sale_payments.payment_method_id', '=', 'payment_methods.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                payment_methods.name,
                payment_methods.type,
                COUNT(DISTINCT sales.id)                        AS transactions,
                COALESCE(SUM(sale_payments.amount), 0)          AS total_amount
            ')
            ->groupBy('payment_methods.id', 'payment_methods.name', 'payment_methods.type')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn($r) => [
                'name'         => $r->name,
                'type'         => $r->type,
                'transactions' => (int) $r->transactions,
                'amount'       => (int) $r->total_amount,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  7. PERFORMA PER TOKO (super admin only)
        // ══════════════════════════════════════════════════════════════════════
        $byStore = [];
        if ($isSuperAdmin) {
            $byStore = DB::table('sales')
                ->join('stores', 'sales.store_id', '=', 'stores.id')
                ->where('sales.status', 'completed')
                ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
                ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
                ->selectRaw('
                    stores.id,
                    stores.name,
                    stores.code,
                    COUNT(sales.id)                             AS transactions,
                    COALESCE(SUM(sales.total), 0)               AS revenue,
                    COALESCE(SUM(sales.cogs_total), 0)          AS cogs,
                    COALESCE(SUM(sales.gross_profit), 0)         AS gross_profit,
                    COALESCE(SUM(sales.discount_amount), 0)     AS discount,
                    COALESCE(AVG(sales.total), 0)               AS avg_order
                ')
                ->groupBy('stores.id', 'stores.name', 'stores.code')
                ->orderByDesc('gross_profit')
                ->get()
                ->map(fn($r) => [
                    'id'           => $r->id,
                    'name'         => $r->name,
                    'code'         => $r->code,
                    'transactions' => (int) $r->transactions,
                    'revenue'      => (int) $r->revenue,
                    'cogs'         => (int) $r->cogs,
                    'gross_profit' => (int) $r->gross_profit,
                    'discount'     => (int) $r->discount,
                    'avg_order'    => (int) $r->avg_order,
                    'margin_pct'   => $r->revenue > 0 ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
                ])
                ->toArray();
        }

        // ══════════════════════════════════════════════════════════════════════
        //  8. ANALISIS DISKON
        // ══════════════════════════════════════════════════════════════════════
        // Migration: sale_discounts.discount_category & discount_type ADA ✓
        $discountAnalysis = DB::table('sale_discounts')
            ->join('sales', 'sale_discounts.sale_id', '=', 'sales.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                sale_discounts.discount_category                    AS category,
                sale_discounts.discount_type                        AS type,
                COUNT(DISTINCT sales.id)                            AS usage_count,
                COALESCE(SUM(sale_discounts.applied_amount), 0)     AS total_amount
            ')
            ->groupBy('sale_discounts.discount_category', 'sale_discounts.discount_type')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn($r) => [
                'category'     => $r->category,
                'type'         => $r->type,
                'usage_count'  => (int) $r->usage_count,
                'total_amount' => (int) $r->total_amount,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  9. TABEL DETAIL TRANSAKSI (top 50)
        //
        //  Migration:
        //    - sales.sold_at         ← bukan sale_date + sale_time terpisah
        //    - sales.subtotal        ← bukan subtotal_before_discount
        //    - cashier_name snapshot ← tersimpan langsung di sales
        //    - customer_name snapshot← tersimpan langsung di sales
        // ══════════════════════════════════════════════════════════════════════
        $detailTransactions = DB::table('sales')
            ->leftJoin('customers', 'sales.customer_id', '=', 'customers.id')
            ->leftJoin('users',     'sales.cashier_id',  '=', 'users.id')
            ->join('stores',        'sales.store_id',    '=', 'stores.id')
            ->when($storeId, fn($q) => $q->where('sales.store_id', $storeId))
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                sales.sale_number,
                sales.sold_at,
                sales.subtotal,
                sales.discount_amount,
                sales.total,
                sales.cogs_total,
                sales.gross_profit,
                stores.name                                         AS store_name,
                COALESCE(sales.customer_name, customers.name)       AS customer_name,
                COALESCE(sales.cashier_name, users.name)            AS cashier_name
            ')
            ->orderByDesc('sales.sold_at')
            ->limit(50)
            ->get()
            ->map(fn($r) => [
                'invoice'      => $r->sale_number,
                'date'         => Carbon::parse($r->sold_at)->format('d M Y'),
                'time'         => Carbon::parse($r->sold_at)->format('H:i'),
                'store'        => $r->store_name,
                'customer'     => $r->customer_name ?? 'Walk-in',
                'cashier'      => $r->cashier_name  ?? '-',
                'gross_sales'  => (int) $r->subtotal,
                'discount'     => (int) $r->discount_amount,
                'revenue'      => (int) $r->total,
                'cogs'         => (int) $r->cogs_total,
                'gross_profit' => (int) $r->gross_profit,
                'margin_pct'   => $r->total > 0 ? round(($r->gross_profit / $r->total) * 100, 1) : 0,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  10. REKAP HARIAN (untuk sparkline / mini chart)
        // ══════════════════════════════════════════════════════════════════════
        $dailyMargin = DB::table('sales')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$dateFrom, $dateTo])
            ->selectRaw('
                DATE(sold_at)                   AS sale_date,
                COALESCE(SUM(total), 0)         AS revenue,
                COALESCE(SUM(gross_profit), 0)  AS gross_profit,
                COUNT(*)                        AS transactions
            ')
            ->groupBy(DB::raw('DATE(sold_at)'))
            ->orderBy(DB::raw('DATE(sold_at)'))
            ->get()
            ->map(fn($r) => [
                'date'         => Carbon::parse($r->sale_date)->format('d/m'),
                'revenue'      => (int) $r->revenue,
                'gross_profit' => (int) $r->gross_profit,
                'margin_pct'   => $r->revenue > 0 ? round(($r->gross_profit / $r->revenue) * 100, 1) : 0,
                'transactions' => (int) $r->transactions,
            ]);

        // ══════════════════════════════════════════════════════════════════════
        //  RETURN
        // ══════════════════════════════════════════════════════════════════════
        return Inertia::render('Laporan/Keuangan', [
            'filters' => [
                'store_id'  => $storeId,
                'date_from' => $dateFrom->toDateString(),
                'date_to'   => $dateTo->toDateString(),
                'group_by'  => $groupBy,
            ],
            'stores'       => $stores,
            'isSuperAdmin' => $isSuperAdmin,

            'summary' => [
                'grossSales'        => (int) $summary->gross_sales,
                'totalDiscount'     => (int) $summary->total_discount,
                'totalRevenue'      => (int) $summary->total_revenue,
                'totalCogs'         => (int) $summary->total_cogs,
                'grossProfit'       => (int) $summary->gross_profit,
                'grossMarginPct'    => $grossMarginPct,
                'markupPct'         => $markupPct,
                'discountRatePct'   => $discountRatePct,
                'totalTransactions' => (int) $summary->total_transactions,
                'avgOrderValue'     => (int) $summary->avg_order_value,
                'avgProfitPerTx'    => (int) $summary->avg_profit_per_tx,
                'uniqueCustomers'   => (int) $summary->unique_customers,
                'activeCashiers'    => (int) $summary->active_cashiers,
            ],

            'trendData'          => $trendData,
            'dailyMargin'        => $dailyMargin,
            'byIntensity'        => $byIntensity,
            'bySize'             => $bySize,
            'byVariant'          => $byVariant,
            'byPayment'          => $byPayment,
            'byStore'            => $byStore,
            'discountAnalysis'   => $discountAnalysis,
            'detailTransactions' => $detailTransactions,
        ]);
    }
}
