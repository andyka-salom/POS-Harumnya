<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\IngredientCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class IngredientController extends Controller
{
    // ─── Ingredients ─────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $ingredients = Ingredient::query()
            ->with('category:id,name,ingredient_type')
            ->when($request->search,      fn($q) => $q->search($request->search))
            ->when($request->category_id, fn($q) => $q->where('ingredient_category_id', $request->category_id))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $categories = IngredientCategory::orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'ingredient_type', 'sort_order', 'is_active']);

        return Inertia::render('Dashboard/Ingredients/Index', [
            'ingredients' => $ingredients,
            'categories'  => $categories,
            'filters'     => $request->only(['search', 'category_id']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Dashboard/Ingredients/Create', [
            'categories' => IngredientCategory::where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'ingredient_type']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'ingredient_category_id' => 'required|exists:ingredient_categories,id',
            'code'                   => 'required|string|max:100|unique:ingredients,code',
            'name'                   => 'required|string|max:255',
            'unit'                   => ['required', 'string', Rule::in(['ml', 'gr', 'kg', 'liter', 'pcs'])],
            'sort_order'             => 'nullable|integer|min:0',
            'description'            => 'nullable|string|max:1000',
            'image'                  => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'is_active'              => 'boolean',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('ingredients', 'public');
        }

        // average_cost selalu mulai 0 — diperbarui via WAC saat PO diterima
        $data['average_cost'] = 0;
        $data['sort_order']   = $data['sort_order'] ?? 0;

        Ingredient::create($data);

        return redirect()->route('ingredients.index')
            ->with('success', 'Bahan Baku berhasil ditambahkan!');
    }

    public function edit(Ingredient $ingredient)
    {
        return Inertia::render('Dashboard/Ingredients/Edit', [
            'ingredient' => $ingredient,
            'categories' => IngredientCategory::orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'ingredient_type']),
        ]);
    }

    public function update(Request $request, Ingredient $ingredient)
    {
        $data = $request->validate([
            'ingredient_category_id' => 'required|exists:ingredient_categories,id',
            'code'                   => ['required', 'string', 'max:100', Rule::unique('ingredients')->ignore($ingredient->id)],
            'name'                   => 'required|string|max:255',
            'unit'                   => ['required', 'string', Rule::in(['ml', 'gr', 'kg', 'liter', 'pcs'])],
            'sort_order'             => 'nullable|integer|min:0',
            'description'            => 'nullable|string|max:1000',
            'image'                  => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'is_active'              => 'boolean',
            // average_cost tidak boleh diubah dari form — hanya via WAC
        ]);

        if ($request->hasFile('image')) {
            if ($ingredient->image) {
                Storage::disk('public')->delete($ingredient->image);
            }
            $data['image'] = $request->file('image')->store('ingredients', 'public');
        }

        $data['sort_order'] = $data['sort_order'] ?? 0;

        $ingredient->update($data);

        return redirect()->route('ingredients.index')
            ->with('success', 'Bahan Baku berhasil diperbarui!');
    }

    public function destroy(Ingredient $ingredient)
    {
        // Cek apakah ingredient digunakan di recipe
        if ($ingredient->variantRecipes()->exists()) {
            return back()->with('error', 'Gagal: Bahan masih digunakan di formula variant.');
        }

        if ($ingredient->productRecipes()->exists()) {
            return back()->with('error', 'Gagal: Bahan masih digunakan di resep produk.');
        }

        if ($ingredient->image) {
            Storage::disk('public')->delete($ingredient->image);
        }

        $ingredient->delete();

        return back()->with('success', 'Bahan Baku berhasil dihapus!');
    }

    // ─── Categories ───────────────────────────────────────────────────────

    public function storeCategory(Request $request)
    {
        IngredientCategory::create($request->validate([
            'code'            => 'required|string|max:50|unique:ingredient_categories,code',
            'name'            => 'required|string|max:100',
            'ingredient_type' => ['required', Rule::in(['oil', 'alcohol', 'other'])],
            'description'     => 'nullable|string|max:500',
            'sort_order'      => 'nullable|integer|min:0',
            'is_active'       => 'boolean',
        ]));

        return back()->with('success', 'Kategori Bahan berhasil ditambahkan!');
    }

    public function updateCategory(Request $request, IngredientCategory $category)
    {
        $category->update($request->validate([
            'code'            => ['required', 'string', 'max:50', Rule::unique('ingredient_categories')->ignore($category->id)],
            'name'            => 'required|string|max:100',
            'ingredient_type' => ['required', Rule::in(['oil', 'alcohol', 'other'])],
            'description'     => 'nullable|string|max:500',
            'sort_order'      => 'nullable|integer|min:0',
            'is_active'       => 'boolean',
        ]));

        return back()->with('success', 'Kategori berhasil diperbarui!');
    }

    public function destroyCategory(IngredientCategory $category)
    {
        if ($category->ingredients()->exists()) {
            return back()->with('error', 'Gagal: Kategori masih memiliki bahan baku. Pindahkan atau hapus bahan terlebih dahulu.');
        }

        $category->delete();

        return back()->with('success', 'Kategori berhasil dihapus!');
    }
}
