<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Http\Requests\CustomerRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $customers = Customer::query()
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->when($request->segment, fn ($q, $s) => $q->segment($s))
            ->when($request->tier, fn ($q, $t) => $q->where('tier', $t))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', $request->is_active === 'true'))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Dashboard/Customers/Index', [
            'customers' => $customers,
            'filters'   => $request->only(['search', 'segment', 'tier', 'is_active']),
            'tiers'     => Customer::TIERS,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Dashboard/Customers/Form');
    }

    public function store(CustomerRequest $request)
    {
        Customer::create($request->validated());

        return to_route('customers.index')->with('success', 'Pelanggan berhasil ditambahkan.');
    }

    public function show(Customer $customer): Response
    {
        $customer->loadCount('sales');

        return Inertia::render('Dashboard/Customers/Show', [
            'customer' => $customer,
            'stats'    => [
                'total_orders'      => $customer->sales_count,
                'recent_sales'      => $customer->sales()->latest('sold_at')->limit(5)->get([
                    'id', 'sale_number', 'total', 'status', 'sold_at',
                ]),
                'favorite_products' => DB::table('sale_items')
                    ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                    ->where('sales.customer_id', $customer->id)
                    ->whereNull('sales.deleted_at')
                    ->select('sale_items.product_name', DB::raw('count(*) as total'))
                    ->groupBy('sale_items.product_name')
                    ->orderByDesc('total')
                    ->limit(3)
                    ->get(),
            ],
        ]);
    }

    public function edit(Customer $customer): Response
    {
        return Inertia::render('Dashboard/Customers/Form', ['customer' => $customer]);
    }

    public function update(CustomerRequest $request, Customer $customer)
    {
        $validated = $request->validated();

        // Recalculate tier jika poin berubah
        if (isset($validated['points'])) {
            $validated['tier'] = Customer::resolveTier((int) $validated['points']);
        }

        $customer->update($validated);

        return to_route('customers.index')->with('success', 'Data pelanggan berhasil diperbarui.');
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return back()->with('success', 'Pelanggan berhasil dihapus.');
    }

    public function export(): StreamedResponse
    {
        return new StreamedResponse(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Kode', 'Nama', 'Email', 'Telepon', 'Gender',
                'Poin Aktif', 'Total Poin Diperoleh', 'Total Transaksi',
                'Total Belanja', 'Tier', 'Status', 'Terdaftar',
            ]);

            Customer::withTrashed(false)->chunk(500, function ($customers) use ($handle) {
                foreach ($customers as $c) {
                    fputcsv($handle, [
                        $c->code,
                        $c->name,
                        $c->email,
                        $c->phone,
                        $c->gender,
                        $c->points,
                        $c->lifetime_points_earned,
                        $c->total_transactions,
                        $c->lifetime_spending,
                        ucfirst($c->tier),
                        $c->is_active ? 'Aktif' : 'Nonaktif',
                        $c->registered_at?->format('d/m/Y') ?? '-',
                    ]);
                }
            });

            fclose($handle);
        }, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="customers_' . date('Ymd') . '.csv"',
        ]);
    }
}
