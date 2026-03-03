<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Models\StoreCategory;
use App\Models\Variant;

class StoreCategoryController extends Controller
{
    // =========================================================================
    // INDEX
    // =========================================================================

    public function index(Request $request): Response
    {
        $categories = StoreCategory::query()
            // FIX: wherePivot tidak bisa dipakai di withCount subquery (PostgreSQL error).
            // Gunakan DB::raw subquery langsung untuk menghitung variant aktif di whitelist.
            ->withCount('stores')
            ->selectSub(
                DB::table('store_category_variants')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('store_category_variants.store_category_id', 'store_categories.id')
                    ->where('store_category_variants.is_active', true),
                'variant_count'
            )
            ->when(
                $request->filled('search'),
                fn ($q) => $q->search($request->search)
            )
            ->when(
                $request->filled('is_active'),
                fn ($q) => $q->where('is_active', $request->boolean('is_active'))
            )
            ->ordered()
            ->paginate((int) $request->input('per_page', 12))
            ->withQueryString()
            ->through(fn ($c) => [
                'id'                 => $c->id,
                'code'               => $c->code,
                'name'               => $c->name,
                'description'        => $c->description,
                'allow_all_variants' => (bool) $c->allow_all_variants,
                'sort_order'         => (int) $c->sort_order,
                'is_active'          => (bool) $c->is_active,
                'stores_count'       => (int) $c->stores_count,
                'variant_count'      => (int) $c->variant_count,
                'created_at'         => $c->created_at->format('d M Y'),
            ]);

        return Inertia::render('Dashboard/StoreCategories/Index', [
            'categories' => $categories,
            'filters'    => $request->only(['search', 'is_active', 'per_page']),
        ]);
    }

    // =========================================================================
    // CREATE
    // =========================================================================

    public function create(): Response
    {
        return Inertia::render('Dashboard/StoreCategories/Create');
    }

    // =========================================================================
    // STORE
    // =========================================================================

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'code'        => 'required|string|max:20|unique:store_categories,code',
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'sort_order'  => 'nullable|integer|min:0|max:9999',
        ], [
            'code.required' => 'Kode kategori wajib diisi.',
            'code.unique'   => 'Kode kategori sudah digunakan.',
            'code.max'      => 'Kode maksimal 20 karakter.',
            'name.required' => 'Nama kategori wajib diisi.',
            'name.max'      => 'Nama maksimal 100 karakter.',
        ]);

        try {
            DB::beginTransaction();

            $category = StoreCategory::create([
                'code'               => strtoupper(trim($request->input('code'))),
                'name'               => trim($request->input('name')),
                'description'        => $request->input('description') ? trim($request->input('description')) : null,
                // $request->boolean() handles: true, false, 1, 0, "1", "0", "true", "false"
                'allow_all_variants' => $request->boolean('allow_all_variants', true),
                'sort_order'         => (int) $request->input('sort_order', 0),
                'is_active'          => $request->boolean('is_active', true),
            ]);

            DB::commit();

            return redirect()
                ->route('store-categories.index')
                ->with('success', "Kategori {$category->code} berhasil ditambahkan! 🏷️");

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);
            return back()
                ->withInput()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // =========================================================================
    // EDIT
    // =========================================================================

    public function edit(StoreCategory $storeCategory): Response
    {
        return Inertia::render('Dashboard/StoreCategories/Edit', [
            'category' => [
                'id'                 => $storeCategory->id,
                'code'               => $storeCategory->code,
                'name'               => $storeCategory->name,
                'description'        => $storeCategory->description ?? '',
                'allow_all_variants' => (bool) $storeCategory->allow_all_variants,
                'sort_order'         => (int) $storeCategory->sort_order,
                'is_active'          => (bool) $storeCategory->is_active,
            ],
        ]);
    }

    // =========================================================================
    // UPDATE
    // =========================================================================

    public function update(Request $request, StoreCategory $storeCategory): RedirectResponse
    {
        $request->validate([
            'code'        => 'required|string|max:20|unique:store_categories,code,' . $storeCategory->id,
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'sort_order'  => 'nullable|integer|min:0|max:9999',
        ], [
            'code.required' => 'Kode kategori wajib diisi.',
            'code.unique'   => 'Kode kategori sudah digunakan.',
            'code.max'      => 'Kode maksimal 20 karakter.',
            'name.required' => 'Nama kategori wajib diisi.',
            'name.max'      => 'Nama maksimal 100 karakter.',
        ]);

        try {
            DB::beginTransaction();

            $storeCategory->update([
                'code'               => strtoupper(trim($request->input('code'))),
                'name'               => trim($request->input('name')),
                'description'        => $request->input('description') ? trim($request->input('description')) : null,
                'allow_all_variants' => $request->boolean('allow_all_variants', true),
                'sort_order'         => (int) $request->input('sort_order', 0),
                'is_active'          => $request->boolean('is_active', true),
            ]);

            DB::commit();

            return redirect()
                ->route('store-categories.index')
                ->with('success', "Kategori {$storeCategory->code} berhasil diperbarui! ✨");

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);
            return back()
                ->withInput()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // =========================================================================
    // DESTROY
    // =========================================================================

    public function destroy(StoreCategory $storeCategory): RedirectResponse
    {
        try {
            DB::beginTransaction();
            // Lepas semua store dari kategori ini sebelum hapus
            $storeCategory->stores()->update(['store_category_id' => null]);
            $storeCategory->delete();
            DB::commit();

            return redirect()
                ->route('store-categories.index')
                ->with('success', 'Kategori toko berhasil dihapus!');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);
            return back()->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // =========================================================================
    // TOGGLE ACTIVE
    // =========================================================================

    public function toggle(StoreCategory $storeCategory): RedirectResponse
    {
        $storeCategory->update(['is_active' => ! $storeCategory->is_active]);
        $label = $storeCategory->is_active ? 'diaktifkan' : 'dinonaktifkan';
        return back()->with('success', "Kategori {$storeCategory->code} berhasil {$label}.");
    }

    // =========================================================================
    // VARIANTS — Halaman kelola whitelist
    // =========================================================================

    public function variants(StoreCategory $storeCategory): Response
    {
        // Ambil semua variant aktif
        $allVariants = Variant::where('is_active', true)
            ->ordered()
            ->get(['id', 'code', 'name', 'gender', 'image']);

        // Ambil pivot whitelist kategori ini (satu query)
        $whitelisted = DB::table('store_category_variants')
            ->where('store_category_id', $storeCategory->id)
            ->get()
            ->keyBy('variant_id');

        $variants = $allVariants->map(fn ($v) => [
            'id'          => $v->id,
            'code'        => $v->code,
            'name'        => $v->name,
            'gender'      => $v->gender,
            'image'       => $v->image,
            'whitelisted' => $whitelisted->has($v->id),
            'wl_active'   => (bool) ($whitelisted->get($v->id)?->is_active ?? false),
        ]);

        return Inertia::render('Dashboard/StoreCategories/Variants', [
            'category' => [
                'id'                 => $storeCategory->id,
                'code'               => $storeCategory->code,
                'name'               => $storeCategory->name,
                'allow_all_variants' => (bool) $storeCategory->allow_all_variants,
            ],
            'variants' => $variants,
        ]);
    }

    // =========================================================================
    // SYNC VARIANTS — Bulk save whitelist
    // =========================================================================

    public function syncVariants(Request $request, StoreCategory $storeCategory): RedirectResponse
    {
        // Variants menggunakan UUID — ambil sebagai string
        $incomingIds = collect($request->input('variant_ids', []))
            ->map(fn ($id) => (string) $id)
            ->filter(fn ($id) => !empty($id))
            ->unique()
            ->values();

        // Validasi UUID exists (skip jika kosong — boleh simpan whitelist kosong)
        if ($incomingIds->isNotEmpty()) {
            $request->merge(['variant_ids' => $incomingIds->toArray()]);
            $request->validate([
                'variant_ids'   => 'array',
                'variant_ids.*' => 'string|exists:variants,id',
            ]);
        }

        try {
            DB::beginTransaction();

            $categoryId = (string) $storeCategory->id;
            $now        = now();

            // 1. Hapus semua whitelist lama untuk kategori ini
            DB::table('store_category_variants')
                ->where('store_category_id', $categoryId)
                ->delete();

            // 2. Insert baru — WAJIB generate UUID untuk kolom id
            //    karena pivot table store_category_variants punya PK uuid('id')
            if ($incomingIds->isNotEmpty()) {
                $rows = $incomingIds->map(fn ($variantId) => [
                    'id'                => (string) \Illuminate\Support\Str::uuid(),
                    'store_category_id' => $categoryId,
                    'variant_id'        => $variantId,
                    'is_active'         => true,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ])->toArray();

                DB::table('store_category_variants')->insert($rows);
            }

            DB::commit();

            $count = $incomingIds->count();
            return back()->with('success', "Whitelist diperbarui: {$count} variant dipilih. ✅");

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);
            return back()->with('error', 'Gagal menyimpan: ' . $e->getMessage());
        }
    }
}
