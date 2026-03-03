<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\Store;
use App\Models\StoreCategory;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Http\Requests\Store\StoreStoreRequest;
use App\Http\Requests\Store\UpdateStoreRequest;

class StoreController extends Controller
{
    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    public function index(Request $request): Response
    {
        $stores = Store::query()
            ->select([
                'id', 'code', 'name', 'address', 'phone',
                'manager_name', 'email', 'is_active',
                'store_category_id',   // ← tambahan
                'created_at',
            ])
            ->with(['storeCategory:id,code,name,allow_all_variants'])  // ← eager load
            ->when($request->filled('search'),
                fn ($q) => $q->search($request->search)
            )
            ->when(
                $request->has('is_active') && $request->is_active !== '',
                fn ($q) => $q->where('is_active', $request->boolean('is_active'))
            )
            ->when(
                $request->filled('store_category_id'),                  // ← filter baru
                fn ($q) => $q->where('store_category_id', $request->store_category_id)
            )
            ->ordered()
            ->paginate($request->input('per_page', 12))
            ->withQueryString()
            ->through(fn ($s) => [
                'id'                => $s->id,
                'code'              => $s->code,
                'name'              => $s->name,
                'address'           => $s->address,
                'phone'             => $s->phone,
                'manager_name'      => $s->manager_name,
                'email'             => $s->email,
                'is_active'         => $s->is_active,
                'created_at'        => $s->created_at->format('d M Y'),
                // Kategori
                'store_category_id' => $s->store_category_id,
                'store_category'    => $s->storeCategory ? [
                    'id'                 => $s->storeCategory->id,
                    'code'               => $s->storeCategory->code,
                    'name'               => $s->storeCategory->name,
                    'allow_all_variants' => $s->storeCategory->allow_all_variants,
                ] : null,
            ]);

        // Kirim daftar kategori untuk filter & dropdown form
        $categories = StoreCategory::active()
            ->ordered()
            ->get(['id', 'code', 'name', 'allow_all_variants']);

        return Inertia::render('Dashboard/Stores/Index', [
            'stores'     => $stores,
            'categories' => $categories,
            'filters'    => $request->only(['search', 'is_active', 'store_category_id', 'per_page']),
        ]);
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    public function create(): Response
    {
        $categories = StoreCategory::active()
            ->ordered()
            ->get(['id', 'code', 'name']);

        return Inertia::render('Dashboard/Stores/Create', [
            'categories' => $categories,
        ]);
    }

    // -------------------------------------------------------------------------
    // Store
    // -------------------------------------------------------------------------

    public function store(StoreStoreRequest $request): RedirectResponse
    {
        try {
            DB::beginTransaction();
            Store::create($request->validated());
            DB::commit();

            return redirect()
                ->route('stores.index')
                ->with('success', 'Toko berhasil ditambahkan! 🏪');

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

    public function edit(Store $store): Response
    {
        $categories = StoreCategory::active()
            ->ordered()
            ->get(['id', 'code', 'name']);

        return Inertia::render('Dashboard/Stores/Edit', [
            'store' => [
                'id'                => $store->id,
                'code'              => $store->code,
                'name'              => $store->name,
                'address'           => $store->address      ?? '',
                'phone'             => $store->phone        ?? '',
                'manager_name'      => $store->manager_name ?? '',
                'email'             => $store->email        ?? '',
                'is_active'         => $store->is_active,
                'store_category_id' => $store->store_category_id ?? '',   // ← tambahan
            ],
            'categories' => $categories,
        ]);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function update(UpdateStoreRequest $request, Store $store): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $store->update($request->validated());
            DB::commit();

            return redirect()
                ->route('stores.index')
                ->with('success', 'Data toko diperbarui! ✨');

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

    public function destroy(Store $store): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $store->delete();
            DB::commit();

            return redirect()
                ->route('stores.index')
                ->with('success', 'Toko berhasil dihapus! 🗑️');

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
            'ids.*' => 'exists:stores,id',
        ], [
            'ids.required' => 'Pilih minimal 1 toko untuk dihapus.',
            'ids.min'      => 'Pilih minimal 1 toko untuk dihapus.',
            'ids.*.exists' => 'Salah satu toko tidak ditemukan.',
        ]);

        try {
            DB::beginTransaction();

            $count = Store::whereIn('id', $request->ids)->count();
            Store::whereIn('id', $request->ids)->delete();

            DB::commit();

            return redirect()
                ->route('stores.index')
                ->with('success', "{$count} toko berhasil dihapus!");

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }
}
