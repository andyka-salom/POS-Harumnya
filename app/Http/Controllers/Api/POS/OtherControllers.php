<?php

namespace App\Http\Controllers\Api\POS;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * SaleController
 *
 * Riwayat transaksi & proses retur.
 */
class SaleController extends Controller
{
    /**
     * GET /pos/sales
     *
     * List transaksi di store aktif.
     * Default: hari ini. Bisa filter by tanggal.
     *
     * Query params:
     *   - date       : YYYY-MM-DD (default: hari ini)
     *   - status     : completed | cancelled | refunded
     *   - per_page   : default 20
     */
    public function index(Request $request): JsonResponse
    {
        $store = $request->attributes->get('active_store');
        $date  = $request->input('date', now()->toDateString());

        $sales = Sale::query()
            ->where('store_id', $store->id)
            ->whereDate('sold_at', $date)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->with(['saleItems:id,sale_id,product_name,qty', 'salePayments:id,sale_id,payment_method_name,payment_method_type,amount'])
            ->orderByDesc('sold_at')
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'data' => collect($sales->items())->map(fn ($s) => [
                'id'             => $s->id,
                'sale_number'    => $s->sale_number,
                'sold_at'        => $s->sold_at,
                'cashier_name'   => $s->cashier_name,
                'customer_name'  => $s->customer_name,
                'total'          => $s->total,
                'total_formatted' => 'Rp ' . number_format($s->total, 0, ',', '.'),
                'status'         => $s->status,
                'items_summary'  => $s->saleItems->map(fn ($i) => $i->product_name . ' x' . $i->qty)->implode(', '),
                'payment_method' => $s->salePayments->first()?->payment_method_name,
            ]),
            'pagination' => [
                'current_page' => $sales->currentPage(),
                'last_page'    => $sales->lastPage(),
                'total'        => $sales->total(),
            ],
        ]);
    }

    /**
     * GET /pos/sales/{sale}
     *
     * Detail transaksi lengkap.
     */
    public function show(Request $request, Sale $sale): JsonResponse
    {
        $store = $request->attributes->get('active_store');
        abort_if($sale->store_id !== $store->id, 403);

        $sale->load([
            'saleItems.saleItemPackagings',
            'saleDiscounts',
            'salePayments',
            'customer:id,name,phone,tier',
            'saleReturns:id,sale_id,return_number,status,total_refund,returned_at',
        ]);

        return response()->json([
            'data' => [
                'id'             => $sale->id,
                'sale_number'    => $sale->sale_number,
                'sold_at'        => $sale->sold_at,
                'cashier_name'   => $sale->cashier_name,
                'sales_person'   => $sale->sales_person_name,
                'customer'       => $sale->customer
                    ? ['name' => $sale->customer_name, 'phone' => $sale->customer?->phone, 'tier' => $sale->customer?->tier]
                    : null,
                'status'         => $sale->status,
                'items'          => $sale->saleItems->map(fn ($item) => [
                    'id'          => $item->id,
                    'name'        => $item->product_name,
                    'variant'     => $item->variant_name,
                    'intensity'   => $item->intensity_code,
                    'size_ml'     => $item->size_ml,
                    'qty'         => $item->qty,
                    'unit_price'  => $item->unit_price,
                    'subtotal'    => $item->subtotal,
                    'packaging'   => $item->saleItemPackagings->map(fn ($p) => [
                        'name'     => $p->packaging_name,
                        'qty'      => $p->qty,
                        'subtotal' => $p->subtotal,
                    ]),
                ]),
                'discounts'      => $sale->saleDiscounts->map(fn ($d) => [
                    'name'   => $d->discount_name,
                    'amount' => $d->applied_amount,
                ]),
                'summary' => [
                    'subtotal'       => $sale->subtotal,
                    'discount'       => $sale->discount_amount,
                    'total'          => $sale->total,
                    'amount_paid'    => $sale->amount_paid,
                    'change'         => $sale->change_amount,
                    'points_earned'  => $sale->points_earned,
                ],
                'payments'       => $sale->salePayments->map(fn ($p) => [
                    'method' => $p->payment_method_name,
                    'type'   => $p->payment_method_type,
                    'amount' => $p->amount,
                    'fee'    => $p->admin_fee,
                    'ref'    => $p->reference_number,
                ]),
                'returns'        => $sale->saleReturns,
            ],
        ]);
    }

    /**
     * POST /pos/sales/{sale}/return
     *
     * Buat retur transaksi.
     *
     * Body:
     * {
     *   "return_type"   : "refund",
     *   "refund_method" : "cash",
     *   "reason"        : "Produk tidak sesuai",
     *   "items" : [
     *     { "sale_item_id": "uuid", "qty_returned": 1 }
     *   ]
     * }
     */
    public function createReturn(Request $request, Sale $sale): JsonResponse
    {
        $store   = $request->attributes->get('active_store');
        $cashier = $request->user();

        abort_if($sale->store_id !== $store->id, 403);
        abort_if($sale->status !== 'completed', 422, 'Hanya transaksi completed yang bisa diretur.');

        $validated = $request->validate([
            'return_type'   => 'required|in:refund,exchange',
            'refund_method' => 'required|in:cash,store_credit,original_payment',
            'reason'        => 'nullable|string|max:500',
            'items'         => 'required|array|min:1',
            'items.*.sale_item_id' => 'required|uuid|exists:sale_items,id',
            'items.*.qty_returned' => 'required|integer|min:1',
        ]);

        $sale->load('saleItems');

        // Validasi qty retur tidak melebihi qty beli
        $totalRefund = 0;
        $itemsData   = [];

        foreach ($validated['items'] as $item) {
            $saleItem = $sale->saleItems->firstWhere('id', $item['sale_item_id']);

            if (! $saleItem) {
                return response()->json(['message' => 'Item tidak ditemukan di transaksi ini.'], 422);
            }

            if ($item['qty_returned'] > $saleItem->qty) {
                return response()->json([
                    'message' => "Qty retur ({$item['qty_returned']}) melebihi qty beli ({$saleItem->qty}) untuk item {$saleItem->product_name}.",
                ], 422);
            }

            $refundAmount = ($saleItem->unit_price * $item['qty_returned']);
            $totalRefund  += $refundAmount;

            $itemsData[] = [
                'sale_item_id'  => $saleItem->id,
                'qty_returned'  => $item['qty_returned'],
                'refund_amount' => $refundAmount,
                'reason'        => $validated['reason'],
            ];
        }

        $saleReturn = DB::transaction(function () use ($sale, $store, $cashier, $validated, $itemsData, $totalRefund) {
            $return = SaleReturn::create([
                'return_number' => 'RET/' . now()->format('Ymd') . '/' . str_pad(SaleReturn::whereDate('returned_at', today())->count() + 1, 4, '0', STR_PAD_LEFT),
                'sale_id'       => $sale->id,
                'store_id'      => $store->id,
                'cashier_id'    => $cashier->id,
                'returned_at'   => now(),
                'return_type'   => $validated['return_type'],
                'total_refund'  => $totalRefund,
                'refund_method' => $validated['refund_method'],
                'reason'        => $validated['reason'],
                'status'        => 'pending',
            ]);

            foreach ($itemsData as $item) {
                SaleReturnItem::create(array_merge($item, ['sale_return_id' => $return->id]));
            }

            $sale->update(['status' => 'refunded']);

            return $return;
        });

        return response()->json([
            'message'       => 'Retur berhasil dibuat, menunggu approval.',
            'return_number' => $saleReturn->return_number,
            'total_refund'  => $saleReturn->total_refund,
            'status'        => $saleReturn->status,
        ], 201);
    }

    /**
     * GET /pos/sales/{sale}/return/{saleReturn}
     *
     * Detail retur.
     */
    public function showReturn(Request $request, Sale $sale, SaleReturn $saleReturn): JsonResponse
    {
        $store = $request->attributes->get('active_store');
        abort_if($sale->store_id !== $store->id, 403);
        abort_if($saleReturn->sale_id !== $sale->id, 404);

        $saleReturn->load('saleReturnItems.saleItem:id,product_name,unit_price');

        return response()->json(['data' => $saleReturn]);
    }
}


/**
 * StockController
 *
 * Cek stok bahan & packaging di store aktif (READ ONLY untuk kasir).
 */
class StockController extends Controller
{
    /**
     * GET /pos/stock/ingredients
     *
     * Stok bahan di store aktif.
     * Query params: search, category
     */
    public function ingredients(Request $request): JsonResponse
    {
        $store = $request->attributes->get('active_store');

        $stocks = StoreIngredientStock::query()
            ->with('ingredient:id,code,name,unit,ingredient_category_id',
                   'ingredient.ingredientCategory:id,name,ingredient_type')
            ->where('store_id', $store->id)
            ->when($request->filled('search'), fn ($q) =>
                $q->whereHas('ingredient', fn ($iq) =>
                    $iq->where('name', 'like', '%' . $request->search . '%')
                       ->orWhere('code', 'like', '%' . $request->search . '%')
                )
            )
            ->get();

        return response()->json([
            'data' => $stocks->map(fn ($s) => [
                'ingredient_id'   => $s->ingredient_id,
                'code'            => $s->ingredient?->code,
                'name'            => $s->ingredient?->name,
                'unit'            => $s->ingredient?->unit,
                'category'        => $s->ingredient?->ingredientCategory?->name,
                'ingredient_type' => $s->ingredient?->ingredientCategory?->ingredient_type,
                'quantity'        => $s->quantity,
                'min_stock'       => $s->min_stock,
                'is_low'          => $s->min_stock !== null && $s->quantity <= $s->min_stock,
                'average_cost'    => $s->average_cost,
                'total_value'     => $s->total_value,
                'last_in_at'      => $s->last_in_at,
            ]),
        ]);
    }

    /**
     * GET /pos/stock/packaging
     *
     * Stok packaging di store aktif.
     */
    public function packaging(Request $request): JsonResponse
    {
        $store = $request->attributes->get('active_store');

        $stocks = StorePackagingStock::query()
            ->with('packagingMaterial:id,code,name,unit,packaging_category_id',
                   'packagingMaterial.packagingCategory:id,name')
            ->where('store_id', $store->id)
            ->get();

        return response()->json([
            'data' => $stocks->map(fn ($s) => [
                'packaging_id'   => $s->packaging_material_id,
                'code'           => $s->packagingMaterial?->code,
                'name'           => $s->packagingMaterial?->name,
                'unit'           => $s->packagingMaterial?->unit,
                'category'       => $s->packagingMaterial?->packagingCategory?->name,
                'quantity'       => $s->quantity,
                'min_stock'      => $s->min_stock,
                'is_low'         => $s->min_stock !== null && $s->quantity <= $s->min_stock,
                'average_cost'   => $s->average_cost,
                'total_value'    => $s->total_value,
            ]),
        ]);
    }

    /**
     * GET /pos/stock/low
     *
     * Semua stok yang berada di bawah min_stock.
     * Untuk notifikasi/alert di dashboard kasir.
     */
    public function lowStock(Request $request): JsonResponse
    {
        $store = $request->attributes->get('active_store');

        $lowIngredients = StoreIngredientStock::query()
            ->with('ingredient:id,code,name,unit')
            ->where('store_id', $store->id)
            ->whereNotNull('min_stock')
            ->whereColumn('quantity', '<=', 'min_stock')
            ->get()
            ->map(fn ($s) => [
                'type'      => 'ingredient',
                'id'        => $s->ingredient_id,
                'code'      => $s->ingredient?->code,
                'name'      => $s->ingredient?->name,
                'unit'      => $s->ingredient?->unit,
                'quantity'  => $s->quantity,
                'min_stock' => $s->min_stock,
            ]);

        $lowPackaging = StorePackagingStock::query()
            ->with('packagingMaterial:id,code,name,unit')
            ->where('store_id', $store->id)
            ->whereNotNull('min_stock')
            ->whereColumn('quantity', '<=', 'min_stock')
            ->get()
            ->map(fn ($s) => [
                'type'      => 'packaging',
                'id'        => $s->packaging_material_id,
                'code'      => $s->packagingMaterial?->code,
                'name'      => $s->packagingMaterial?->name,
                'unit'      => $s->packagingMaterial?->unit,
                'quantity'  => $s->quantity,
                'min_stock' => $s->min_stock,
            ]);

        $all = $lowIngredients->merge($lowPackaging)->values();

        return response()->json([
            'count' => $all->count(),
            'data'  => $all,
        ]);
    }
}


/**
 * ShiftController
 *
 * Ringkasan shift / hari kasir.
 */
class ShiftController extends Controller
{
    /**
     * GET /pos/shift/summary
     *
     * Ringkasan transaksi hari ini untuk kasir yang login.
     */
    public function summary(Request $request): JsonResponse
    {
        $store   = $request->attributes->get('active_store');
        $cashier = $request->user();

        $sales = Sale::query()
            ->where('store_id', $store->id)
            ->where('cashier_id', $cashier->id)
            ->whereDate('sold_at', today())
            ->where('status', 'completed')
            ->get();

        $totalTransactions = $sales->count();
        $totalRevenue      = $sales->sum('total');
        $totalDiscount     = $sales->sum('discount_amount');
        $totalCogs         = $sales->sum('cogs_total');
        $totalGrossProfit  = $sales->sum('gross_profit');
        $avgTransaction    = $totalTransactions > 0 ? $totalRevenue / $totalTransactions : 0;

        return response()->json([
            'date'              => today()->toDateString(),
            'store_name'        => $store->name,
            'cashier_name'      => $cashier->name,
            'summary' => [
                'total_transactions'   => $totalTransactions,
                'total_revenue'        => $totalRevenue,
                'revenue_formatted'    => 'Rp ' . number_format($totalRevenue, 0, ',', '.'),
                'total_discount'       => $totalDiscount,
                'discount_formatted'   => 'Rp ' . number_format($totalDiscount, 0, ',', '.'),
                'total_cogs'           => $totalCogs,
                'total_gross_profit'   => $totalGrossProfit,
                'profit_formatted'     => 'Rp ' . number_format($totalGrossProfit, 0, ',', '.'),
                'avg_transaction'      => round($avgTransaction, 2),
                'avg_formatted'        => 'Rp ' . number_format($avgTransaction, 0, ',', '.'),
            ],
        ]);
    }

    /**
     * GET /pos/shift/payment-breakdown
     *
     * Breakdown total per metode pembayaran hari ini.
     */
    public function paymentBreakdown(Request $request): JsonResponse
    {
        $store   = $request->attributes->get('active_store');
        $cashier = $request->user();

        $breakdown = \App\Models\SalePayment::query()
            ->whereHas('sale', fn ($q) =>
                $q->where('store_id', $store->id)
                  ->where('cashier_id', $cashier->id)
                  ->whereDate('sold_at', today())
                  ->where('status', 'completed')
            )
            ->where('payment_status', 'completed')
            ->select(
                'payment_method_name',
                'payment_method_type',
                \DB::raw('COUNT(*) as transaction_count'),
                \DB::raw('SUM(amount) as total_amount'),
                \DB::raw('SUM(admin_fee) as total_admin_fee')
            )
            ->groupBy('payment_method_name', 'payment_method_type')
            ->orderByDesc('total_amount')
            ->get();

        return response()->json([
            'data' => $breakdown->map(fn ($b) => [
                'method_name'       => $b->payment_method_name,
                'method_type'       => $b->payment_method_type,
                'transaction_count' => $b->transaction_count,
                'total_amount'      => $b->total_amount,
                'amount_formatted'  => 'Rp ' . number_format($b->total_amount, 0, ',', '.'),
                'total_admin_fee'   => $b->total_admin_fee,
            ]),
            'grand_total' => $breakdown->sum('total_amount'),
        ]);
    }
}
