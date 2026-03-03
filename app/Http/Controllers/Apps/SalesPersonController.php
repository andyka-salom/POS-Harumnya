<?php

namespace App\Http\Controllers\Apps;

use App\Models\Store;
use App\Models\SalesPerson;
use App\Models\SalesTarget;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class SalesPersonController extends Controller
{
    /**
     * Tampilan Daftar Sales People
     */
    public function index(Request $request)
    {
        $salesPeople = SalesPerson::with('store:id,name')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Dashboard/SalesPeople/Index', [
            'salesPeople' => $salesPeople,
            'filters'     => $request->only(['search'])
        ]);
    }

    /**
     * Tampilan Form Tambah Sales
     */
    public function create()
    {
        return Inertia::render('Dashboard/SalesPeople/Create', [
            'stores' => Store::where('is_active', true)->get(['id', 'name'])
        ]);
    }

    /**
     * Proses Simpan Sales Baru
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'store_id'  => 'required|exists:stores,id',
            'code'      => 'required|string|max:50|unique:sales_people,code',
            'name'      => 'required|string|max:255',
            'phone'     => 'nullable|string|max:20',
            'email'     => 'nullable|email|max:100',
            'join_date' => 'nullable|date',
            'is_active' => 'boolean'
        ]);

        // Generate UUID
        $validated['id'] = (string) Str::uuid();

        SalesPerson::create($validated);

        return to_route('sales-people.index')
            ->with('success', 'Tenaga penjual berhasil ditambahkan!');
    }

    /**
     * Tampilan Form Edit Sales
     */
    public function edit(SalesPerson $salesPerson)
    {
        return Inertia::render('Dashboard/SalesPeople/Edit', [
            'salesPerson' => $salesPerson,
            'stores'      => Store::where('is_active', true)->get(['id', 'name'])
        ]);
    }

    /**
     * Proses Update Data Sales
     */
    public function update(Request $request, SalesPerson $salesPerson)
    {
        $request->validate([
            'store_id'  => 'required|exists:stores,id',
            'code'      => [
                'required',
                'string',
                'max:50',
                Rule::unique('sales_people', 'code')->ignore($salesPerson->id)
            ],
            'name'      => 'required|string|max:255',
            'phone'     => 'nullable|string|max:20',
            'email'     => 'nullable|email|max:100',
            'join_date' => 'nullable|date',
            'is_active' => 'boolean'
        ]);

        $salesPerson->update($request->all());

        return to_route('sales-people.index')
            ->with('success', 'Data tenaga penjual berhasil diperbarui!');
    }

    /**
     * Hapus Sales (Soft Delete)
     */
    public function destroy(SalesPerson $salesPerson)
    {
        $salesPerson->delete();

        return to_route('sales-people.index')
            ->with('success', 'Tenaga penjual berhasil dihapus!');
    }

    /**
     * Tampilan Manajemen Target
     */
    public function targets(SalesPerson $salesPerson)
    {
        $targets = SalesTarget::where('sales_person_id', $salesPerson->id)
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get();

        return Inertia::render('Dashboard/SalesPeople/Targets', [
            'salesPerson' => $salesPerson->load('store:id,name'),
            'targets'     => $targets
        ]);
    }

    /**
     * Proses Simpan/Update Target Bulanan
     */
    public function storeTarget(Request $request, SalesPerson $salesPerson)
    {
        $validated = $request->validate([
            'year'            => 'required|integer|min:2020|max:2099',
            'month'           => 'required|integer|between:1,12',
            'target_amount'   => 'nullable|numeric|min:0',
            'target_quantity' => 'nullable|numeric|min:0',
        ], [
            'year.required'  => 'Tahun wajib diisi.',
            'month.required' => 'Bulan wajib diisi.',
        ]);

        // Generate UUID untuk record baru
        $validated['id'] = (string) Str::uuid();

        // Gunakan updateOrCreate untuk menghindari duplikasi kombinasi Sales+Tahun+Bulan
        SalesTarget::updateOrCreate(
            [
                'sales_person_id' => $salesPerson->id,
                'year'            => $validated['year'],
                'month'           => $validated['month'],
            ],
            [
                'id'              => $validated['id'],
                'target_amount'   => $validated['target_amount'] ?? null,
                'target_quantity' => $validated['target_quantity'] ?? null,
            ]
        );

        return back()->with('success', 'Target berhasil diperbarui!');
    }
}
