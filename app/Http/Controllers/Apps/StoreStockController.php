<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use App\Models\Store;
use App\Models\Ingredient;
use App\Models\PackagingMaterial;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;
use App\Models\StockMovement;
use App\Traits\TracksUserAction;

class StoreStockController extends Controller
{
    use TracksUserAction;

    // ─── Index ────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $user              = auth()->user();
        $isSuperAdmin      = $user->isSuperAdmin();
        $restrictedStoreId = $isSuperAdmin ? null : $user->default_store_id;

        $itemType = $request->item_type ?? 'ingredient';

        if ($itemType === 'ingredient') {
            $stocks = StoreIngredientStock::query()
                ->with([
                    'store:id,name,code',
                    'ingredient:id,name,code,unit',
                    'lastInUser:id,name',
                    'lastOutUser:id,name',
                ])
                ->when($request->search, fn ($q, $s) =>
                    $q->whereHas('ingredient', fn ($q) =>
                        $q->where('name', 'like', "%{$s}%")
                          ->orWhere('code', 'like', "%{$s}%")
                    )->orWhereHas('store', fn ($q) =>
                        $q->where('name', 'like', "%{$s}%")
                    )
                )
                ->when($restrictedStoreId, fn ($q, $id) => $q->where('store_id', $id))
                ->when(! $restrictedStoreId && $request->store_id, fn ($q) =>
                    $q->where('store_id', $request->store_id)
                )
                ->when($request->stock_status, function ($q, $status) {
                    match ($status) {
                        'low'  => $q->lowStock(),
                        'out'  => $q->outOfStock(),
                        'over' => $q->overStock(),
                        default => null,
                    };
                })
                ->latest('updated_at')
                ->paginate(10)
                ->withQueryString();
        } else {
            $stocks = StorePackagingStock::query()
                ->with([
                    'store:id,name,code',
                    'packagingMaterial:id,name,code,size_id',
                    'packagingMaterial.size:id,name',
                    'lastInUser:id,name',
                    'lastOutUser:id,name',
                ])
                ->when($request->search, fn ($q, $s) =>
                    $q->whereHas('packagingMaterial', fn ($q) =>
                        $q->where('name', 'like', "%{$s}%")
                          ->orWhere('code', 'like', "%{$s}%")
                    )->orWhereHas('store', fn ($q) =>
                        $q->where('name', 'like', "%{$s}%")
                    )
                )
                ->when($restrictedStoreId, fn ($q, $id) => $q->where('store_id', $id))
                ->when(! $restrictedStoreId && $request->store_id, fn ($q) =>
                    $q->where('store_id', $request->store_id)
                )
                ->when($request->stock_status, function ($q, $status) {
                    match ($status) {
                        'low'  => $q->lowStock(),
                        'out'  => $q->outOfStock(),
                        'over' => $q->overStock(),
                        default => null,
                    };
                })
                ->latest('updated_at')
                ->paginate(10)
                ->withQueryString();
        }

        $summaryIngredientBase = StoreIngredientStock::query()
            ->when($restrictedStoreId, fn ($q, $id) => $q->where('store_id', $id));
        $summaryPackagingBase  = StorePackagingStock::query()
            ->when($restrictedStoreId, fn ($q, $id) => $q->where('store_id', $id));

        // Per-tab summary (untuk 4 summary cards sesuai tab aktif)
        $activeBase = $itemType === 'ingredient'
            ? clone $summaryIngredientBase
            : clone $summaryPackagingBase;

        $storesQuery = Store::where('is_active', true)->orderBy('name');
        if ($restrictedStoreId) {
            $storesQuery->where('id', $restrictedStoreId);
        }

        return Inertia::render('Dashboard/StoreStocks/Index', [
            'stocks'       => $stocks,
            'stores'       => $storesQuery->get(['id', 'name', 'code']),
            'itemType'     => $itemType,
            'isSuperAdmin' => $isSuperAdmin,
            'summary'      => [
                'total_ingredients'     => (clone $summaryIngredientBase)->count(),
                'total_packaging'       => (clone $summaryPackagingBase)->count(),
                'low_stock_ingredients' => (clone $summaryIngredientBase)->lowStock()->count(),
                'low_stock_packaging'   => (clone $summaryPackagingBase)->lowStock()->count(),
            ],
            // 4 summary cards untuk tab yang sedang aktif
            'itemSummary'  => [
                'total_items'  => (clone $activeBase)->count(),
                'low_stock'    => (clone $activeBase)->lowStock()->count(),
                'out_of_stock' => (clone $activeBase)->outOfStock()->count(),
                'total_value'  => (float) (clone $activeBase)->sum('total_value'),
            ],
            'filters' => $request->only(['search', 'store_id', 'stock_status', 'item_type']),
        ]);
    }

    // ─── Show ─────────────────────────────────────────────────────────────────

    public function show(Request $request, string $id)
    {
        $itemType = $request->item_type ?? 'ingredient';

        if ($itemType === 'ingredient') {
            $stock = StoreIngredientStock::with([
                'store:id,name,code',
                'ingredient:id,name,code,unit',
                'lastInUser:id,name,email',
                'lastOutUser:id,name,email',
            ])->findOrFail($id);

            $movements = $this->getMovements('ingredient', $stock->ingredient_id, $stock->store_id);
            $summary   = $this->getMovementSummary('ingredient', $stock->ingredient_id, $stock->store_id);
        } else {
            $stock = StorePackagingStock::with([
                'store:id,name,code',
                'packagingMaterial:id,name,code,size_id',
                'packagingMaterial.size:id,name',
                'lastInUser:id,name,email',
                'lastOutUser:id,name,email',
            ])->findOrFail($id);

            $movements = $this->getMovements('packaging_material', $stock->packaging_material_id, $stock->store_id);
            $summary   = $this->getMovementSummary('packaging_material', $stock->packaging_material_id, $stock->store_id);
        }

        return Inertia::render('Dashboard/StoreStocks/Show', [
            'stock'     => $stock,
            'movements' => $movements,
            'summary'   => $summary,
            'itemType'  => $itemType,
        ]);
    }

    // ─── Create ───────────────────────────────────────────────────────────────

    public function create()
    {
        return Inertia::render('Dashboard/StoreStocks/Create', [
            'stores' => Store::where('is_active', true)
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

    // ─── Store ────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_type'    => 'required|in:ingredient,packaging',
            'store_id'     => 'required|exists:stores,id',
            'item_id'      => 'required|uuid',
            // Stok awal tidak boleh negatif; negatif hanya bisa terjadi via movement
            'quantity'     => 'required|integer|min:0',
            'min_stock'    => 'nullable|integer|min:0',
            'max_stock'    => 'nullable|integer|min:0|gte:min_stock',
            'average_cost' => 'nullable|numeric|min:0',
        ]);

        $qty    = (int) $validated['quantity'];
        $cost   = (float) ($validated['average_cost'] ?? 0);
        $now    = now();
        $userId = auth()->id();   // users.id = bigInteger

        if ($validated['item_type'] === 'ingredient') {
            if (StoreIngredientStock::where('store_id', $validated['store_id'])
                    ->where('ingredient_id', $validated['item_id'])->exists()) {
                return back()->withErrors([
                    'item_id' => 'Stok untuk ingredient ini sudah ada di toko yang dipilih.',
                ]);
            }

            StoreIngredientStock::create([
                'store_id'      => $validated['store_id'],
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
            if (StorePackagingStock::where('store_id', $validated['store_id'])
                    ->where('packaging_material_id', $validated['item_id'])->exists()) {
                return back()->withErrors([
                    'item_id' => 'Stok untuk packaging ini sudah ada di toko yang dipilih.',
                ]);
            }

            StorePackagingStock::create([
                'store_id'              => $validated['store_id'],
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

        return to_route('store-stocks.index', ['item_type' => $validated['item_type']])
            ->with('success', 'Stok toko berhasil ditambahkan!');
    }

    // ─── Edit ─────────────────────────────────────────────────────────────────

    public function edit(Request $request, string $id)
    {
        $itemType = $request->item_type ?? 'ingredient';

        $stock = $itemType === 'ingredient'
            ? StoreIngredientStock::with([
                'store:id,name,code',
                'ingredient:id,name,code,unit',
              ])->findOrFail($id)
            : StorePackagingStock::with([
                'store:id,name,code',
                'packagingMaterial:id,name,code,size_id',
                'packagingMaterial.size:id,name',
              ])->findOrFail($id);

        return Inertia::render('Dashboard/StoreStocks/Edit', [
            'stock'    => $stock,
            'itemType' => $itemType,
        ]);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            'item_type' => 'required|in:ingredient,packaging',
            'min_stock' => 'nullable|integer|min:0',
            'max_stock' => 'nullable|integer|min:0|gte:min_stock',
        ]);

        // Kedua tabel punya max_stock per migration terbaru
        $updateData = [
            'min_stock' => isset($validated['min_stock']) ? (int) $validated['min_stock'] : null,
            'max_stock' => isset($validated['max_stock']) ? (int) $validated['max_stock'] : null,
        ];

        if ($validated['item_type'] === 'ingredient') {
            StoreIngredientStock::findOrFail($id)->update($updateData);
        } else {
            StorePackagingStock::findOrFail($id)->update($updateData);
        }

        return to_route('store-stocks.index', ['item_type' => $validated['item_type']])
            ->with('success', 'Pengaturan stok berhasil diperbarui!');
    }

    // ─── Destroy ──────────────────────────────────────────────────────────────

    public function destroy(Request $request, string $id)
    {
        $itemType = $request->item_type ?? 'ingredient';

        if ($itemType === 'ingredient') {
            $stock       = StoreIngredientStock::findOrFail($id);
            $itemId      = $stock->ingredient_id;
            $itemTypeVal = 'ingredient';
        } else {
            $stock       = StorePackagingStock::findOrFail($id);
            $itemId      = $stock->packaging_material_id;
            $itemTypeVal = 'packaging_material';
        }

        $hasMovements = StockMovement::where('location_type', 'store')
            ->where('location_id', $stock->store_id)
            ->where('item_type', $itemTypeVal)
            ->where('item_id', $itemId)
            ->exists();

        if ($hasMovements) {
            return back()->withErrors([
                'delete' => 'Tidak dapat menghapus stok yang memiliki riwayat pergerakan.',
            ]);
        }

        $stock->delete();

        return to_route('store-stocks.index', ['item_type' => $itemType])
            ->with('success', 'Stok toko berhasil dihapus!');
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function getMovements(string $itemType, string $itemId, string $storeId)
    {
        $movements = StockMovement::query()
            ->where('location_type', 'store')
            ->where('location_id', $storeId)
            ->where('item_type', $itemType)
            ->where('item_id', $itemId)
            ->with('creator:id,name')
            ->orderByDesc('movement_date')
            ->orderByDesc('created_at')
            ->paginate(20);

        $movements->getCollection()->transform(function ($mv) {
            return [
                'id'                  => $mv->id,
                'movement_type'       => $mv->movement_type,
                'movement_type_label' => $this->movementTypeLabel($mv->movement_type),
                // ✅ Perbaikan: gunakan qty_change (nama kolom di migration)
                'direction'           => $mv->qty_change > 0 ? 'in' : 'out',
                'direction_label'     => $mv->qty_change > 0 ? 'Masuk' : 'Keluar',
                'quantity'            => abs((int) $mv->qty_change),
                // ✅ Perbaikan: gunakan qty_before & qty_after (nama kolom di migration)
                'stock_before'        => (int) $mv->qty_before,
                'stock_after'         => (int) $mv->qty_after,
                'unit_cost'           => (float) $mv->unit_cost,
                'avg_cost_before'     => (float) $mv->avg_cost_before,
                'avg_cost_after'      => (float) $mv->avg_cost_after,
                'movement_date'       => $mv->movement_date,
                'reference_number'    => $mv->reference_number,
                'notes'               => $mv->notes,
                'creator'             => $mv->creator,
                'created_at'          => $mv->created_at,
            ];
        });

        return $movements;
    }

    private function getMovementSummary(string $itemType, string $itemId, string $storeId): array
    {
        $base = StockMovement::where('location_type', 'store')
            ->where('location_id', $storeId)
            ->where('item_type', $itemType)
            ->where('item_id', $itemId);

        return [
            // ✅ Perbaikan: gunakan qty_change (nama kolom di migration)
            'total_in'        => (int) (clone $base)->where('qty_change', '>', 0)->sum('qty_change'),
            'total_out'       => (int) abs((clone $base)->where('qty_change', '<', 0)->sum('qty_change')),
            'total_movements' => (clone $base)->count(),
            'by_type'         => (clone $base)
                // ✅ Perbaikan: gunakan qty_change pada selectRaw
                ->selectRaw('movement_type, count(*) as count, sum(qty_change) as net_qty')
                ->groupBy('movement_type')
                ->get()
                ->map(fn ($r) => [
                    'type'    => $r->movement_type,
                    'label'   => $this->movementTypeLabel($r->movement_type),
                    'count'   => $r->count,
                    'net_qty' => (int) $r->net_qty,
                ]),
        ];
    }

    private function movementTypeLabel(string $type): string
    {
        return match ($type) {
            'purchase_in'    => 'Pembelian Masuk',
            'transfer_in'    => 'Transfer Masuk',
            'transfer_out'   => 'Transfer Keluar',
            'repack_in'      => 'Repack Masuk',
            'repack_out'     => 'Repack Keluar',
            'production_in'  => 'Produksi Masuk',
            'production_out' => 'Produksi Keluar',
            'sales_out'      => 'Penjualan',
            'sale_out'       => 'Penjualan',
            'adjustment_in'  => 'Penyesuaian (+)',
            'adjustment_out' => 'Penyesuaian (-)',
            'waste'          => 'Waste/Rusak',
            'expired_out'    => 'Kadaluarsa',
            'return_in'      => 'Retur Masuk',
            'return_out'     => 'Retur Keluar',
            default          => ucwords(str_replace('_', ' ', $type)),
        };
    }
}
