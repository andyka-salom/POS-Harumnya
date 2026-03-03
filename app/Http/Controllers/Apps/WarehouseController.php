<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\StoreWarehouseRequest;
use App\Http\Requests\Warehouse\UpdateWarehouseRequest;

class WarehouseController extends Controller
{
    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    public function index(Request $request): Response
    {
        $warehouses = Warehouse::query()
            ->select(['id', 'code', 'name', 'address', 'phone', 'manager_name', 'email', 'is_active', 'created_at'])
            ->when($request->filled('search'),   fn ($q) => $q->search($request->search))
            ->when(
                $request->has('is_active') && $request->is_active !== '',
                fn ($q) => $q->where('is_active', $request->boolean('is_active'))
            )
            ->ordered()
            ->paginate($request->input('per_page', 12))
            ->withQueryString()
            ->through(fn ($w) => [
                'id'           => $w->id,
                'code'         => $w->code,
                'name'         => $w->name,
                'address'      => $w->address,
                'phone'        => $w->phone,
                'manager_name' => $w->manager_name,
                'email'        => $w->email,
                'is_active'    => $w->is_active,
                'created_at'   => $w->created_at->format('d M Y'),
            ]);

        return Inertia::render('Dashboard/Warehouses/Index', [
            'warehouses' => $warehouses,
            'filters'    => $request->only(['search', 'is_active', 'per_page']),
        ]);
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    public function create(): Response
    {
        return Inertia::render('Dashboard/Warehouses/Create');
    }

    // -------------------------------------------------------------------------
    // Store
    // -------------------------------------------------------------------------

    public function store(StoreWarehouseRequest $request): RedirectResponse
    {
        try {
            DB::beginTransaction();
            Warehouse::create($request->validated());
            DB::commit();

            return redirect()
                ->route('warehouses.index')
                ->with('success', 'Gudang berhasil ditambahkan! 🏭');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->withInput()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // -------------------------------------------------------------------------
    // Edit
    // -------------------------------------------------------------------------

    public function edit(Warehouse $warehouse): Response
    {
        return Inertia::render('Dashboard/Warehouses/Edit', [
            'warehouse' => [
                'id'           => $warehouse->id,
                'code'         => $warehouse->code,
                'name'         => $warehouse->name,
                'address'      => $warehouse->address  ?? '',
                'phone'        => $warehouse->phone    ?? '',
                'manager_name' => $warehouse->manager_name ?? '',
                'email'        => $warehouse->email    ?? '',
                'is_active'    => $warehouse->is_active,
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function update(UpdateWarehouseRequest $request, Warehouse $warehouse): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $warehouse->update($request->validated());
            DB::commit();

            return redirect()
                ->route('warehouses.index')
                ->with('success', 'Data gudang diperbarui! ✨');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->withInput()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // -------------------------------------------------------------------------
    // Destroy
    // -------------------------------------------------------------------------

    public function destroy(Warehouse $warehouse): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $warehouse->delete();
            DB::commit();

            return redirect()
                ->route('warehouses.index')
                ->with('success', 'Gudang berhasil dihapus! 🗑️');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }
    // -------------------------------------------------------------------------
    // Bulk Delete
    // -------------------------------------------------------------------------

    public function bulkDelete(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'exists:warehouses,id',
        ], [
            'ids.required' => 'Pilih minimal 1 gudang untuk dihapus.',
            'ids.min'      => 'Pilih minimal 1 gudang untuk dihapus.',
            'ids.*.exists' => 'Salah satu gudang tidak ditemukan.',
        ]);

        try {
            DB::beginTransaction();

            $count = Warehouse::whereIn('id', $request->ids)->count();
            Warehouse::whereIn('id', $request->ids)->delete();

            DB::commit();

            return redirect()
                ->route('warehouses.index')
                ->with('success', "{$count} gudang berhasil dihapus!");

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }
}
