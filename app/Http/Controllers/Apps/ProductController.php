<?php

namespace App\Http\Controllers\Apps;

use App\Models\Product;
use App\Models\Variant;
use App\Models\Intensity;
use App\Models\Size;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    // ─── Index ────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = Product::with([
            'variant:id,code,name,gender',
            'intensity:id,code,name',
            'size:id,name,volume_ml',
            'recipes.ingredient:id,name,unit',
        ])->orderBy('created_at', 'desc');

        // Filter variant
        if ($request->filled('variant_id')) {
            $query->where('variant_id', $request->variant_id);
        }

        // Filter intensity
        if ($request->filled('intensity_id')) {
            $query->where('intensity_id', $request->intensity_id);
        }

        // Filter size
        if ($request->filled('size_id')) {
            $query->where('size_id', $request->size_id);
        }

        // Filter status aktif
        if ($request->filled('is_active')) {
            $query->where('is_active', (bool) $request->is_active);
        }

        // Search SKU / name
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('sku', 'ilike', "%{$search}%")
                  ->orWhere('name', 'ilike', "%{$search}%");
            });
        }

        $products = $query->paginate(20)->withQueryString();

        // Summary stats
        $stats = [
            'total_products'   => Product::count(),
            'active_products'  => Product::where('is_active', true)->count(),
            'total_variants'   => Product::distinct('variant_id')->count('variant_id'),
            'avg_margin'       => round(Product::avg('gross_margin_percentage'), 1),
        ];

        return Inertia::render('Dashboard/Products/Index', [
            'products'   => $products,
            'stats'      => $stats,
            'filters'    => $request->only(['variant_id', 'intensity_id', 'size_id', 'search', 'is_active']),
            'variants'   => Variant::where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name']),
            'intensities'=> Intensity::where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name']),
            'sizes'      => Size::where('is_active', true)->orderBy('volume_ml')->get(['id', 'name', 'volume_ml']),
        ]);
    }

    // ─── Show ─────────────────────────────────────────────────────────────────

    public function show(Product $product)
    {
        $product->load([
            'variant:id,code,name,gender,description',
            'intensity:id,code,name,oil_ratio,alcohol_ratio',
            'size:id,name,volume_ml',
            'recipes.ingredient:id,code,name,unit,average_cost,ingredient_category_id',
            'recipes.ingredient.category:id,name,ingredient_type',
        ]);

        // Grouped recipes by ingredient_type
        $recipesByType = $product->recipes
            ->groupBy(fn($r) => $r->ingredient->category->ingredient_type ?? 'other')
            ->map(fn($group) => $group->map(fn($r) => [
                'id'              => $r->id,
                'ingredient_id'   => $r->ingredient_id,
                'name'            => $r->ingredient->name,
                'code'            => $r->ingredient->code,
                'unit'            => $r->unit,
                'quantity'        => $r->quantity,
                'unit_cost'       => (float) $r->unit_cost,
                'total_cost'      => (int) $r->total_cost,
                'ingredient_type' => $r->ingredient->category->ingredient_type ?? 'other',
            ])->values());

        return Inertia::render('Dashboard/Products/Show', [
            'product'        => $product,
            'recipesByType'  => $recipesByType,
            'costBreakdown'  => [
                'oil_cost'     => (int) $product->recipes
                    ->filter(fn($r) => ($r->ingredient->category->ingredient_type ?? '') === 'oil')
                    ->sum('total_cost'),
                'alcohol_cost' => (int) $product->recipes
                    ->filter(fn($r) => ($r->ingredient->category->ingredient_type ?? '') === 'alcohol')
                    ->sum('total_cost'),
                'other_cost'   => (int) $product->recipes
                    ->filter(fn($r) => ($r->ingredient->category->ingredient_type ?? '') === 'other')
                    ->sum('total_cost'),
                'total_cost'   => (int) $product->production_cost,
            ],
        ]);
    }

    // ─── Toggle active ────────────────────────────────────────────────────────

    public function toggleActive(Product $product)
    {
        $product->update(['is_active' => !$product->is_active]);
        $status = $product->is_active ? 'diaktifkan' : 'dinonaktifkan';
        return back()->with('success', "Product {$product->sku} berhasil {$status}");
    }

    // ─── Recalculate cost ─────────────────────────────────────────────────────

    public function recalculate(Product $product)
    {
        $product->recalculateCosts();
        return back()->with('success', "HPP product {$product->sku} berhasil direcalculate");
    }
}
