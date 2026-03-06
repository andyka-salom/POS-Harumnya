<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use App\Models\Warehouse;
use App\Models\Ingredient;
use App\Models\PackagingMaterial;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\WarehouseIngredientStock;
use App\Models\WarehousePackagingStock;

class WarehouseStockController extends Controller
{
    public function index(Request $request)
    {
        $itemType = $request->item_type ?? 'ingredient';

        if ($itemType === 'ingredient') {
            $stocks = WarehouseIngredientStock::query()
                ->with([
                    'warehouse:id,name,code',
                    'ingredient:id,name,code,unit',
                ])
                ->when($request->search, function ($q, $s) {
                    // BUG FIX: tambahkan return agar scope benar-benar diterapkan
                    $q->where(function ($q) use ($s) {
                        $q->whereHas('ingredient', fn ($q) =>
                            $q->where('name', 'like', "%{$s}%")
                              ->orWhere('code', 'like', "%{$s}%")
                        )->orWhereHas('warehouse', fn ($q) =>
                            $q->where('name', 'like', "%{$s}%")
                        );
                    });
                })
                ->when($request->warehouse_id, fn ($q, $id) =>
                    $q->where('warehouse_id', $id)
                )
                ->when($request->stock_status, function ($q, $status) {
                    // BUG FIX: match tanpa return → scope tidak diterapkan
                    return match ($status) {
                        'low'  => $q->lowStock(),
                        'out'  => $q->outOfStock(),
                        'over' => $q->overStock(),
                        default => $q,
                    };
                })
                ->latest('updated_at')
                ->paginate(10)
                ->withQueryString();

            $summary = [
                'total_items'  => WarehouseIngredientStock::count(),
                'low_stock'    => WarehouseIngredientStock::lowStock()->count(),
                'out_of_stock' => WarehouseIngredientStock::outOfStock()->count(),
                'over_stock'   => WarehouseIngredientStock::overStock()->count(), // BUG FIX: tambah over_stock
                'total_value'  => (float) WarehouseIngredientStock::sum('total_value'),
            ];
        } else {
            $stocks = WarehousePackagingStock::query()
                ->with([
                    'warehouse:id,name,code',
                    'packagingMaterial:id,name,code,size_id',
                    'packagingMaterial.size:id,name',
                ])
                ->when($request->search, function ($q, $s) {
                    $q->where(function ($q) use ($s) {
                        $q->whereHas('packagingMaterial', fn ($q) =>
                            $q->where('name', 'like', "%{$s}%")
                              ->orWhere('code', 'like', "%{$s}%")
                        )->orWhereHas('warehouse', fn ($q) =>
                            $q->where('name', 'like', "%{$s}%")
                        );
                    });
                })
                ->when($request->warehouse_id, fn ($q, $id) =>
                    $q->where('warehouse_id', $id)
                )
                ->when($request->stock_status, function ($q, $status) {
                    return match ($status) {
                        'low'  => $q->lowStock(),
                        'out'  => $q->outOfStock(),
                        'over' => $q->overStock(),
                        default => $q,
                    };
                })
                ->latest('updated_at')
                ->paginate(10)
                ->withQueryString();

            $summary = [
                'total_items'  => WarehousePackagingStock::count(),
                'low_stock'    => WarehousePackagingStock::lowStock()->count(),
                'out_of_stock' => WarehousePackagingStock::outOfStock()->count(),
                'over_stock'   => WarehousePackagingStock::overStock()->count(), // BUG FIX: tambah over_stock
                'total_value'  => (float) WarehousePackagingStock::sum('total_value'),
            ];
        }

        return Inertia::render('Dashboard/WarehouseStocks/Index', [
            'stocks'   => $stocks,
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name', 'code']),
            'itemType' => $itemType,
            'summary'  => $summary,
            'overallSummary' => [
                'total_ingredients'      => WarehouseIngredientStock::count(),
                'total_packaging'        => WarehousePackagingStock::count(),
                'low_stock_ingredients'  => WarehouseIngredientStock::lowStock()->count(),
                'low_stock_packaging'    => WarehousePackagingStock::lowStock()->count(),
                'over_stock_ingredients' => WarehouseIngredientStock::overStock()->count(), // BUG FIX: tambah over_stock
                'over_stock_packaging'   => WarehousePackagingStock::overStock()->count(),  // BUG FIX: tambah over_stock
            ],
            'filters' => $request->only(['search', 'warehouse_id', 'stock_status', 'item_type']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Dashboard/WarehouseStocks/Create', [
            'warehouses' => Warehouse::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),

            'ingredients' => Ingredient::where('is_active', true)
                ->with('category:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'unit', 'ingredient_category_id']),

            'packagingMaterials' => PackagingMaterial::where('is_active', true)
                ->with(['category:id,name', 'size:id,name'])
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'packaging_category_id', 'size_id']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_type'    => 'required|in:ingredient,packaging',
            'warehouse_id' => 'required|exists:warehouses,id',
            'item_id'      => 'required|uuid',
            'quantity'     => 'required|numeric|min:0',
            'min_stock'    => 'nullable|integer|min:0',
            'max_stock'    => 'nullable|integer|min:0|gte:min_stock',
            'average_cost' => 'nullable|numeric|min:0',
        ]);

        $qty    = (int) $validated['quantity'];
        $cost   = (float) ($validated['average_cost'] ?? 0);
        $now    = now();
        $userId = auth()->id();

        if ($validated['item_type'] === 'ingredient') {
            $duplicate = WarehouseIngredientStock::where('warehouse_id', $validated['warehouse_id'])
                ->where('ingredient_id', $validated['item_id'])
                ->exists();

            if ($duplicate) {
                return back()->withErrors([
                    'item_id' => 'Stok untuk ingredient ini sudah ada di gudang yang dipilih.',
                ]);
            }

            WarehouseIngredientStock::create([
                'warehouse_id'  => $validated['warehouse_id'],
                'ingredient_id' => $validated['item_id'],
                'quantity'      => $qty,
                'min_stock'     => isset($validated['min_stock']) ? (int) $validated['min_stock'] : null,
                'max_stock'     => isset($validated['max_stock']) ? (int) $validated['max_stock'] : null,
                'average_cost'  => $cost,
                'total_value'   => $qty * $cost,
                'last_in_at'    => $now,
                'last_in_by'    => $userId,
                'last_in_qty'   => $qty,
            ]);
        } else {
            $duplicate = WarehousePackagingStock::where('warehouse_id', $validated['warehouse_id'])
                ->where('packaging_material_id', $validated['item_id'])
                ->exists();

            if ($duplicate) {
                return back()->withErrors([
                    'item_id' => 'Stok untuk packaging ini sudah ada di gudang yang dipilih.',
                ]);
            }

            WarehousePackagingStock::create([
                'warehouse_id'          => $validated['warehouse_id'],
                'packaging_material_id' => $validated['item_id'],
                'quantity'              => $qty,
                'min_stock'             => isset($validated['min_stock']) ? (int) $validated['min_stock'] : null,
                'max_stock'             => isset($validated['max_stock']) ? (int) $validated['max_stock'] : null,
                'average_cost'          => $cost,
                'total_value'           => $qty * $cost,
                'last_in_at'            => $now,
                'last_in_by'            => $userId,
                'last_in_qty'           => $qty,
            ]);
        }

        return to_route('warehouse-stocks.index', ['item_type' => $validated['item_type']])
            ->with('success', 'Stok gudang berhasil ditambahkan!');
    }

    public function edit(Request $request, string $id)
    {
        $itemType = $request->item_type ?? 'ingredient';

        $stock = $itemType === 'ingredient'
            ? WarehouseIngredientStock::with([
                'warehouse:id,name,code',
                'ingredient:id,name,code,unit',
              ])->findOrFail($id)
            : WarehousePackagingStock::with([
                'warehouse:id,name,code',
                'packagingMaterial:id,name,code,size_id',
                'packagingMaterial.size:id,name',
              ])->findOrFail($id);

        return Inertia::render('Dashboard/WarehouseStocks/Edit', [
            'stock'    => $stock,
            'itemType' => $itemType,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            'item_type' => 'required|in:ingredient,packaging',
            'min_stock' => 'nullable|integer|min:0',
            'max_stock' => 'nullable|integer|min:0|gte:min_stock',
        ]);

        if ($validated['item_type'] === 'ingredient') {
            WarehouseIngredientStock::findOrFail($id)->update([
                'min_stock' => isset($validated['min_stock']) ? (int) $validated['min_stock'] : null,
                'max_stock' => isset($validated['max_stock']) ? (int) $validated['max_stock'] : null,
            ]);
        } else {
            WarehousePackagingStock::findOrFail($id)->update([
                'min_stock' => isset($validated['min_stock']) ? (int) $validated['min_stock'] : null,
                'max_stock' => isset($validated['max_stock']) ? (int) $validated['max_stock'] : null,
            ]);
        }

        return to_route('warehouse-stocks.index', ['item_type' => $validated['item_type']])
            ->with('success', 'Pengaturan stok gudang berhasil diperbarui!');
    }

    public function destroy(Request $request, string $id)
    {
        $itemType = $request->item_type ?? 'ingredient';

        $itemType === 'ingredient'
            ? WarehouseIngredientStock::findOrFail($id)->delete()
            : WarehousePackagingStock::findOrFail($id)->delete();

        return to_route('warehouse-stocks.index', ['item_type' => $itemType])
            ->with('success', 'Stok gudang berhasil dihapus!');
    }
}
