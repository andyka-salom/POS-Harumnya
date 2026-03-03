<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\PackagingCategory;
use App\Models\PackagingMaterial;
use App\Models\Size;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class PackagingController extends Controller
{
    public function index(Request $request)
    {
        $materials = PackagingMaterial::query()
            ->with(['category:id,name', 'size:id,name'])
            ->when($request->search,      fn($q) => $q->search($request->search))
            ->when($request->category_id, fn($q) => $q->where('packaging_category_id', $request->category_id))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        $categories = PackagingCategory::orderBy('sort_order')->orderBy('name')->get();

        return Inertia::render('Dashboard/Packaging/Index', [
            'materials'  => $materials,
            'categories' => $categories,
            'filters'    => $request->only(['search', 'category_id', 'tab']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Dashboard/Packaging/Create', [
            'categories' => PackagingCategory::where('is_active', true)->orderBy('sort_order')->get(),
            'sizes'      => Size::orderBy('sort_order')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'packaging_category_id' => 'required|exists:packaging_categories,id',
            'code'                  => 'required|string|max:100|unique:packaging_materials,code',
            'name'                  => 'required|string|max:255',
            'unit'                  => 'required|string|max:50',
            'size_id'               => 'nullable|exists:sizes,id',
            'image'                 => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'description'           => 'nullable|string',
            // Pricing — sesuai migration 003
            'purchase_price'        => 'nullable|integer|min:0',
            'selling_price'         => 'nullable|integer|min:0',
            // Status
            'is_available_as_addon' => 'boolean',
            'is_active'             => 'boolean',
            'sort_order'            => 'integer|min:0',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('packaging', 'public');
        }

        // average_cost awal = purchase_price (sebelum ada pembelian nyata)
        $data['average_cost'] = $data['purchase_price'] ?? 0;

        PackagingMaterial::create($data);

        return redirect()->route('packaging.index')
            ->with('success', 'Material kemasan berhasil ditambahkan!');
    }

    public function edit(PackagingMaterial $packaging)
    {
        return Inertia::render('Dashboard/Packaging/Edit', [
            'packaging'  => $packaging,
            'categories' => PackagingCategory::orderBy('sort_order')->get(),
            'sizes'      => Size::orderBy('sort_order')->get(),
        ]);
    }

    public function update(Request $request, PackagingMaterial $packaging)
    {
        $data = $request->validate([
            'packaging_category_id' => 'required|exists:packaging_categories,id',
            'code'                  => ['required', 'string', 'max:100', Rule::unique('packaging_materials')->ignore($packaging->id)],
            'name'                  => 'required|string|max:255',
            'unit'                  => 'required|string|max:50',
            'size_id'               => 'nullable|exists:sizes,id',
            'image'                 => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'description'           => 'nullable|string',
            // Pricing
            'purchase_price'        => 'nullable|integer|min:0',
            'selling_price'         => 'nullable|integer|min:0',
            // Status
            'is_available_as_addon' => 'boolean',
            'is_active'             => 'boolean',
            'sort_order'            => 'integer|min:0',
            // average_cost TIDAK boleh diubah manual dari form — hanya via WAC saat purchase
        ]);

        if ($request->hasFile('image')) {
            if ($packaging->image) Storage::disk('public')->delete($packaging->image);
            $data['image'] = $request->file('image')->store('packaging', 'public');
        }

        // Jika average_cost masih 0 (belum pernah ada purchase) dan purchase_price diubah,
        // update juga average_cost sebagai inisialisasi
        if ((float) $packaging->average_cost === 0.0 && isset($data['purchase_price'])) {
            $data['average_cost'] = $data['purchase_price'];
        }

        $packaging->update($data);

        return redirect()->route('packaging.index')
            ->with('success', 'Material kemasan berhasil diperbarui!');
    }

    public function destroy(PackagingMaterial $packaging)
    {
        $packaging->delete();
        return back()->with('success', 'Material kemasan dipindahkan ke sampah!');
    }

    // ─── Category Actions ────────────────────────────────────────────────

    public function storeCategory(Request $request)
    {
        PackagingCategory::create($request->validate([
            'code'        => 'required|string|max:50|unique:packaging_categories,code',
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active'   => 'boolean',
            'sort_order'  => 'integer|min:0',
        ]));
        return back()->with('success', 'Kategori berhasil dibuat!');
    }

    public function updateCategory(Request $request, PackagingCategory $category)
    {
        $category->update($request->validate([
            'code'        => ['required', 'string', 'max:50', Rule::unique('packaging_categories')->ignore($category->id)],
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active'   => 'boolean',
            'sort_order'  => 'integer|min:0',
        ]));
        return back()->with('success', 'Kategori diperbarui!');
    }

    public function destroyCategory(PackagingCategory $category)
    {
        if ($category->materials()->exists()) {
            return back()->with('error', 'Gagal: Kategori masih memiliki material di dalamnya.');
        }
        $category->delete();
        return back()->with('success', 'Kategori dihapus!');
    }
}
