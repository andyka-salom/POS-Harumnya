<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Http\Requests\Supplier\StoreSupplierRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class SupplierController extends Controller
{
    private const DEFAULT_PER_PAGE = 12;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $perPage = $this->getPerPage($request);

        $suppliers = Supplier::query()
            ->when(
                $request->filled('search'),
                fn($q) => $q->search($request->search)
            )
            ->when(
                $request->filled('is_active') && $request->is_active !== '',
                fn($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN))
            )
            ->when(
                $request->filled('payment_term'),
                fn($q) => $q->byPaymentTerm($request->payment_term)
            )
            ->select([
                'id',
                'code',
                'name',
                'contact_person',
                'email',
                'phone',
                'payment_term',
                'credit_limit',
                'is_active',
                'created_at',
            ])
            ->orderBy($request->input('sort', 'name'), $request->input('direction', 'asc'))
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn($supplier) => [
                'id'                     => $supplier->id,
                'code'                   => $supplier->code,
                'name'                   => $supplier->name,
                'contact_person'         => $supplier->contact_person,
                'email'                  => $supplier->email,
                'phone'                  => $supplier->phone,
                'payment_term'           => $supplier->payment_term,
                'payment_term_label'     => $supplier->payment_term_label,
                'credit_limit'           => $supplier->credit_limit,
                'formatted_credit_limit' => $supplier->formatted_credit_limit,
                'is_active'              => $supplier->is_active,
                'status_label'           => $supplier->status_label,
            ]);

        return Inertia::render('Dashboard/Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters'   => $request->only(['search', 'is_active', 'payment_term', 'per_page', 'sort', 'direction']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('Dashboard/Suppliers/Create', [
            'paymentTerms' => $this->getPaymentTermOptions(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSupplierRequest $request): RedirectResponse
    {
        try {
            $supplier = DB::transaction(fn() => Supplier::create($request->validated()));

            Log::info('Supplier created', [
                'supplier_id' => $supplier->id,
                'code'        => $supplier->code,
                'user_id'     => auth()->id(),
            ]);

            return redirect()
                ->route('suppliers.index')
                ->with('success', 'Supplier berhasil ditambahkan! 🚚');

        } catch (\Exception $e) {
            Log::error('Failed to create supplier', [
                'error'   => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return back()
                ->withInput()
                ->with('error', 'Gagal menyimpan supplier: ' . $e->getMessage());
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Supplier $supplier): Response
    {
        return Inertia::render('Dashboard/Suppliers/Edit', [
            'supplier' => [
                'id'             => $supplier->id,
                'code'           => $supplier->code,
                'name'           => $supplier->name,
                'contact_person' => $supplier->contact_person,
                'phone'          => $supplier->phone,
                'email'          => $supplier->email,
                'address'        => $supplier->address,
                'payment_term'   => $supplier->payment_term,
                'credit_limit'   => $supplier->credit_limit,
                'is_active'      => $supplier->is_active,
            ],
            'paymentTerms' => $this->getPaymentTermOptions(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(StoreSupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        try {
            DB::transaction(fn() => $supplier->update($request->validated()));

            Log::info('Supplier updated', [
                'supplier_id' => $supplier->id,
                'code'        => $supplier->code,
                'user_id'     => auth()->id(),
            ]);

            return redirect()
                ->route('suppliers.index')
                ->with('success', 'Data supplier berhasil diperbarui! ✨');

        } catch (\Exception $e) {
            Log::error('Failed to update supplier', [
                'supplier_id' => $supplier->id,
                'error'       => $e->getMessage(),
                'user_id'     => auth()->id(),
            ]);

            return back()
                ->withInput()
                ->with('error', 'Gagal memperbarui supplier: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified resource from storage (soft delete).
     */
    public function destroy(Supplier $supplier): RedirectResponse
    {
        try {
            DB::transaction(fn() => $supplier->delete());

            Log::info('Supplier soft-deleted', [
                'supplier_id' => $supplier->id,
                'code'        => $supplier->code,
                'user_id'     => auth()->id(),
            ]);

            return back()->with('success', 'Supplier berhasil dihapus! 🗑️');

        } catch (\Exception $e) {
            Log::error('Failed to delete supplier', [
                'supplier_id' => $supplier->id,
                'error'       => $e->getMessage(),
                'user_id'     => auth()->id(),
            ]);

            return back()->with('error', 'Gagal menghapus supplier: ' . $e->getMessage());
        }
    }

    /**
     * Restore soft-deleted supplier.
     */
    public function restore(string $id): RedirectResponse
    {
        try {
            DB::transaction(function () use ($id) {
                Supplier::withTrashed()->findOrFail($id)->restore();
            });

            Log::info('Supplier restored', [
                'supplier_id' => $id,
                'user_id'     => auth()->id(),
            ]);

            return back()->with('success', 'Supplier berhasil dipulihkan! ♻️');

        } catch (\Exception $e) {
            Log::error('Failed to restore supplier', [
                'supplier_id' => $id,
                'error'       => $e->getMessage(),
                'user_id'     => auth()->id(),
            ]);

            return back()->with('error', 'Gagal memulihkan supplier: ' . $e->getMessage());
        }
    }

    /**
     * Toggle supplier active status.
     */
    public function toggleStatus(Supplier $supplier): RedirectResponse
    {
        try {
            DB::transaction(fn() => $supplier->update(['is_active' => ! $supplier->is_active]));

            // Refresh model untuk mendapatkan nilai terbaru
            $supplier->refresh();
            $status = $supplier->is_active ? 'diaktifkan' : 'dinonaktifkan';

            Log::info('Supplier status toggled', [
                'supplier_id' => $supplier->id,
                'new_status'  => $supplier->is_active,
                'user_id'     => auth()->id(),
            ]);

            return back()->with('success', "Supplier berhasil {$status}!");

        } catch (\Exception $e) {
            Log::error('Failed to toggle supplier status', [
                'supplier_id' => $supplier->id,
                'error'       => $e->getMessage(),
                'user_id'     => auth()->id(),
            ]);

            return back()->with('error', 'Gagal mengubah status supplier: ' . $e->getMessage());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private function getPaymentTermOptions(): array
    {
        return collect(Supplier::PAYMENT_TERMS)
            ->map(fn($label, $value) => ['value' => $value, 'label' => $label])
            ->values()
            ->toArray();
    }

    private function getPerPage(Request $request): int
    {
        return min(max((int) $request->input('per_page', self::DEFAULT_PER_PAGE), 10), 100);
    }
}
