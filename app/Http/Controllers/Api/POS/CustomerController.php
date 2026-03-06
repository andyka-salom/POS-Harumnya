<?php

namespace App\Http\Controllers\Api\POS;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerPointLedger;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CustomerController
 *
 * Lookup & manajemen customer dari POS mobile.
 */
class CustomerController extends Controller
{
    /**
     * GET /pos/customers?search=081234
     *
     * Cari customer by nama atau nomor HP.
     * Dipanggil saat kasir scan/input nomor HP atau nama.
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => 'required|string|min:2|max:100',
        ]);

        $keyword = $validated['search'];

        $customers = Customer::query()
            ->where('is_active', true)
            ->where(fn ($q) =>
                $q->where('name', 'like', "%{$keyword}%")
                  ->orWhere('phone', 'like', "%{$keyword}%")
            )
            ->orderBy('name')
            ->limit(10)
            ->get(['id', 'code', 'name', 'phone', 'tier', 'points', 'lifetime_spending']);

        return response()->json([
            'data'  => $customers->map(fn ($c) => [
                'id'                 => $c->id,
                'code'               => $c->code,
                'name'               => $c->name,
                'phone'              => $c->phone,
                'tier'               => $c->tier,
                'points'             => $c->points,
                'lifetime_spending'  => $c->lifetime_spending,
                'tier_badge'         => strtoupper($c->tier),
            ]),
            'count' => $customers->count(),
        ]);
    }

    /**
     * GET /pos/customers/{customer}
     *
     * Detail customer: info dasar + tier + poin + statistik.
     */
    public function show(Request $request, Customer $customer): JsonResponse
    {
        return response()->json([
            'data' => [
                'id'                    => $customer->id,
                'code'                  => $customer->code,
                'name'                  => $customer->name,
                'phone'                 => $customer->phone,
                'email'                 => $customer->email,
                'gender'                => $customer->gender,
                'birth_date'            => $customer->birth_date,
                'tier'                  => $customer->tier,
                'tier_badge'            => strtoupper($customer->tier),
                'points'                => $customer->points,
                'lifetime_points_earned' => $customer->lifetime_points_earned,
                'lifetime_spending'     => $customer->lifetime_spending,
                'lifetime_spending_formatted' => 'Rp ' . number_format($customer->lifetime_spending, 0, ',', '.'),
                'total_transactions'    => $customer->total_transactions,
                'registered_at'         => $customer->registered_at,
                'is_active'             => $customer->is_active,
            ],
        ]);
    }

    /**
     * POST /pos/customers
     *
     * Daftarkan customer baru langsung dari POS.
     *
     * Body:
     * {
     *   "name"       : "Budi Santoso",
     *   "phone"      : "081234567890",
     *   "email"      : "budi@email.com",  // opsional
     *   "birth_date" : "1990-05-20",      // opsional
     *   "gender"     : "male"             // opsional
     * }
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'phone'      => 'required|string|max:20|unique:customers,phone',
            'email'      => 'nullable|email|max:100',
            'birth_date' => 'nullable|date',
            'gender'     => 'nullable|in:male,female,other',
        ]);

        $customer = Customer::create([
            'code'          => 'CST-' . strtoupper(\Str::random(8)),
            'name'          => $validated['name'],
            'phone'         => $validated['phone'],
            'email'         => $validated['email'] ?? null,
            'birth_date'    => $validated['birth_date'] ?? null,
            'gender'        => $validated['gender'] ?? null,
            'tier'          => 'bronze',
            'points'        => 0,
            'is_active'     => true,
            'registered_at' => now(),
        ]);

        return response()->json([
            'message' => 'Customer berhasil didaftarkan.',
            'data'    => $customer->only('id', 'code', 'name', 'phone', 'tier', 'points'),
        ], 201);
    }

    /**
     * GET /pos/customers/{customer}/transactions
     *
     * Riwayat transaksi customer (10 terakhir).
     * Query params: per_page (default 10), page
     */
    public function transactions(Request $request, Customer $customer): JsonResponse
    {
        $sales = Sale::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'completed')
            ->with(['saleItems:id,sale_id,product_name,qty,unit_price', 'salePayments:id,sale_id,payment_method_name,amount'])
            ->orderByDesc('sold_at')
            ->paginate($request->input('per_page', 10));

        return response()->json([
            'data' => collect($sales->items())->map(fn ($s) => [
                'sale_id'        => $s->id,
                'sale_number'    => $s->sale_number,
                'sold_at'        => $s->sold_at,
                'total'          => $s->total,
                'total_formatted' => 'Rp ' . number_format($s->total, 0, ',', '.'),
                'points_earned'  => $s->points_earned,
                'items_count'    => $s->saleItems->count(),
                'first_item'     => $s->saleItems->first()?->product_name,
            ]),
            'pagination' => [
                'current_page' => $sales->currentPage(),
                'last_page'    => $sales->lastPage(),
                'total'        => $sales->total(),
            ],
        ]);
    }

    /**
     * GET /pos/customers/{customer}/points
     *
     * Ledger poin customer (10 terakhir + saldo saat ini).
     */
    public function pointLedger(Request $request, Customer $customer): JsonResponse
    {
        $ledgers = CustomerPointLedger::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'type', 'points', 'balance_after', 'notes', 'created_at']);

        return response()->json([
            'current_balance' => $customer->points,
            'data'            => $ledgers,
        ]);
    }
}
