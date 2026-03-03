<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\StockMovement;
use App\Models\Ingredient;
use App\Models\PackagingMaterial;
use App\Models\Warehouse;
use App\Models\Store;
use App\Models\WarehouseIngredientStock;
use App\Models\WarehousePackagingStock;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;

class StockAdjustmentController extends Controller
{

    public function index(Request $request)
    {
        $adjustments = StockAdjustment::query()
            ->with(['creator:id,name', 'items'])
            ->when($request->search, fn($q, $s) =>
                $q->where('adjustment_number', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%")
            )
            ->when($request->status,        fn($q, $s) => $q->where('status', $s))
            ->when($request->type,          fn($q, $t) => $q->where('type', $t))
            ->when($request->location_type, fn($q, $t) => $q->where('location_type', $t))
            ->latest('adjustment_date')->latest('created_at')
            ->paginate(15)->withQueryString();

        $adjustments->getCollection()->each(function ($adj) {
            $adj->location_name = $this->locationName($adj->location_type, $adj->location_id);
            $adj->item_count    = $adj->items->count();
            // value_difference → decimal(15,2): sum sebagai float
            $adj->total_surplus  = round((float) $adj->items->where('difference', '>', 0)->sum('value_difference'), 2);
            $adj->total_shortage = round((float) abs($adj->items->where('difference', '<', 0)->sum('value_difference')), 2);
        });

        return Inertia::render('Dashboard/StockAdjustments/Index', [
            'adjustments' => $adjustments,
            'filters'     => $request->only(['search', 'status', 'type', 'location_type']),
            'summary'     => [
                'total'     => StockAdjustment::count(),
                'pending'   => StockAdjustment::where('status', 'pending')->count(),
                'approved'  => StockAdjustment::where('status', 'approved')->count(),
                'completed' => StockAdjustment::where('status', 'completed')->count(),
            ],
            'typeOptions' => $this->typeOptions(),
        ]);
    }

    // ─── Create ───────────────────────────────────────────────────────────────────

    public function create()
    {
        return Inertia::render('Dashboard/StockAdjustments/Create', [
            'warehouses'         => Warehouse::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'stores'             => Store::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'ingredients'        => Ingredient::where('is_active', true)->with('category:id,name')
                ->orderBy('name')->get(['id', 'name', 'code', 'unit', 'ingredient_category_id']),
            'packagingMaterials' => PackagingMaterial::where('is_active', true)
                ->with(['category:id,name', 'size:id,name'])->orderBy('name')
                ->get(['id', 'name', 'code', 'packaging_category_id', 'size_id']),
            'typeOptions'        => $this->typeOptions(),
        ]);
    }

    // ─── Store (save draft) ───────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $v = $request->validate([
            'location_type'             => 'required|in:warehouse,store',
            'location_id'               => 'required|uuid',
            'adjustment_date'           => 'required|date',
            'type'                      => 'required|in:stock_opname,damage,loss,found,expired,other',
            'notes'                     => 'nullable|string|max:2000',
            'items'                     => 'required|array|min:1',
            'items.*.item_type'         => 'required|in:ingredient,packaging_material',
            'items.*.item_id'           => 'required|uuid',
            'items.*.physical_quantity' => 'required|integer|min:0',
            'items.*.notes'             => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($v) {
            $adj = StockAdjustment::create([
                'adjustment_number' => StockAdjustment::generateNumber(),
                'location_type'     => $v['location_type'],
                'location_id'       => $v['location_id'],
                'adjustment_date'   => $v['adjustment_date'],
                'type'              => $v['type'],
                'status'            => 'draft',
                'notes'             => $v['notes'] ?? null,
                'created_by'        => auth()->id(),
            ]);

            foreach ($v['items'] as $item) {
                $stock       = $this->findStock($v['location_type'], $v['location_id'], $item['item_type'], $item['item_id']);
                $systemQty   = $stock ? (int)   $stock->quantity     : 0;  // bigInteger SIGNED
                $unitCost    = $stock ? (float) $stock->average_cost : 0.0; // decimal(15,4)
                $physicalQty = (int) $item['physical_quantity'];             // bigInteger SIGNED
                $difference  = $physicalQty - $systemQty;                   // bigInteger SIGNED
                // value_difference → decimal(15,2): |diff| × unit_cost
                $valueDiff   = round(abs($difference) * $unitCost, 2);

                $adj->items()->create([
                    'item_type'         => $item['item_type'],
                    'item_id'           => $item['item_id'],
                    'system_quantity'   => $systemQty,
                    'physical_quantity' => $physicalQty,
                    'difference'        => $difference,
                    'unit_cost'         => $unitCost,       // decimal(15,4)
                    'value_difference'  => $valueDiff,      // decimal(15,2)
                    'notes'             => $item['notes'] ?? null,
                ]);
            }
        });

        return to_route('stock-adjustments.index')
            ->with('success', 'Adjustment berhasil disimpan sebagai draft!');
    }

    // ─── Show ─────────────────────────────────────────────────────────────────────

    public function show(string $id)
    {
        $adj = StockAdjustment::with([
            'items', 'creator:id,name', 'approver:id,name',
        ])->findOrFail($id);

        $adj->location_name = $this->locationName($adj->location_type, $adj->location_id);

        $adj->items->each(function ($item) {
            [$name, $code, $unit] = $this->resolveItem($item->item_type, $item->item_id);
            $item->item_name = $name;
            $item->item_code = $code;
            $item->item_unit = $unit;
        });

        // Movements — field names sesuai migration 007
        $movements = StockMovement::where('reference_id', $adj->id)
            ->with('creator:id,name')
            ->orderBy('created_at')
            ->get()
            ->each(function ($m) {
                $m->item_name = $this->resolveItemName($m->item_type, $m->item_id);
            });

        return Inertia::render('Dashboard/StockAdjustments/Show', [
            'adjustment' => $adj,
            'movements'  => $movements,
        ]);
    }

    // ─── Edit ─────────────────────────────────────────────────────────────────────

    public function edit(string $id)
    {
        $adj = StockAdjustment::with('items')->findOrFail($id);
        if (! $adj->canEdit()) {
            return back()->withErrors(['edit' => 'Adjustment yang sudah diproses tidak dapat diedit.']);
        }

        $adj->location_name = $this->locationName($adj->location_type, $adj->location_id);

        return Inertia::render('Dashboard/StockAdjustments/Edit', [
            'adjustment'         => $adj,
            'warehouses'         => Warehouse::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'stores'             => Store::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'ingredients'        => Ingredient::where('is_active', true)->with('category:id,name')
                ->orderBy('name')->get(['id', 'name', 'code', 'unit', 'ingredient_category_id']),
            'packagingMaterials' => PackagingMaterial::where('is_active', true)
                ->with(['category:id,name', 'size:id,name'])->orderBy('name')
                ->get(['id', 'name', 'code', 'packaging_category_id', 'size_id']),
            'typeOptions'        => $this->typeOptions(),
        ]);
    }

    // ─── Update ───────────────────────────────────────────────────────────────────

    public function update(Request $request, string $id)
    {
        $adj = StockAdjustment::findOrFail($id);
        if (! $adj->canEdit()) {
            return back()->withErrors(['edit' => 'Adjustment yang sudah diproses tidak dapat diedit.']);
        }

        $v = $request->validate([
            'adjustment_date'           => 'required|date',
            'type'                      => 'required|in:stock_opname,damage,loss,found,expired,other',
            'notes'                     => 'nullable|string|max:2000',
            'items'                     => 'required|array|min:1',
            'items.*.item_type'         => 'required|in:ingredient,packaging_material',
            'items.*.item_id'           => 'required|uuid',
            'items.*.physical_quantity' => 'required|integer|min:0',
            'items.*.notes'             => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($adj, $v) {
            $adj->update([
                'adjustment_date' => $v['adjustment_date'],
                'type'            => $v['type'],
                'notes'           => $v['notes'] ?? null,
            ]);

            $adj->items()->delete();

            foreach ($v['items'] as $item) {
                $stock       = $this->findStock($adj->location_type, $adj->location_id, $item['item_type'], $item['item_id']);
                $systemQty   = $stock ? (int)   $stock->quantity     : 0;
                $unitCost    = $stock ? (float) $stock->average_cost : 0.0;
                $physicalQty = (int) $item['physical_quantity'];
                $difference  = $physicalQty - $systemQty;
                $valueDiff   = round(abs($difference) * $unitCost, 2); // decimal(15,2)

                $adj->items()->create([
                    'item_type'         => $item['item_type'],
                    'item_id'           => $item['item_id'],
                    'system_quantity'   => $systemQty,
                    'physical_quantity' => $physicalQty,
                    'difference'        => $difference,
                    'unit_cost'         => $unitCost,
                    'value_difference'  => $valueDiff,
                    'notes'             => $item['notes'] ?? null,
                ]);
            }
        });

        return to_route('stock-adjustments.show', $id)
            ->with('success', 'Adjustment berhasil diperbarui!');
    }

    // ─── Workflow: draft → pending ────────────────────────────────────────────────

    public function submit(string $id)
    {
        $adj = StockAdjustment::findOrFail($id);
        if ($adj->status !== 'draft') {
            return back()->withErrors(['status' => 'Hanya draft yang dapat diajukan.']);
        }
        $adj->update(['status' => 'pending']);
        return back()->with('success', 'Adjustment diajukan untuk approval.');
    }

    // ─── Workflow: pending → approved ─────────────────────────────────────────────

    public function approve(string $id)
    {
        $adj = StockAdjustment::findOrFail($id);
        if (! $adj->canApprove()) {
            return back()->withErrors(['status' => 'Adjustment tidak dapat disetujui dari status ini.']);
        }
        $adj->update([
            'status'      => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);
        return back()->with('success', 'Adjustment disetujui.');
    }

    // ─── Workflow: approved → completed ───────────────────────────────────────────

    public function complete(string $id)
    {
        $adj = StockAdjustment::with('items')->findOrFail($id);
        if (! $adj->canComplete()) {
            return back()->withErrors(['status' => 'Adjustment tidak dapat diselesaikan dari status ini.']);
        }

        DB::transaction(function () use ($adj) {
            $userId = auth()->id();
            $now    = now();

            foreach ($adj->items as $item) {
                $diff = (int) $item->difference; // bigInteger SIGNED
                if ($diff === 0) continue;

                $stock = $this->findStock(
                    $adj->location_type, $adj->location_id,
                    $item->item_type,    $item->item_id
                );
                if (! $stock) {
                    $stock = $this->createStock(
                        $adj->location_type, $adj->location_id,
                        $item->item_type,    $item->item_id,
                        ['quantity' => 0, 'average_cost' => (float) $item->unit_cost, 'total_value' => 0.0]
                    );
                }

                $qtyBefore = (int)   $stock->quantity;      // bigInteger SIGNED
                $avgCost   = (float) $stock->average_cost;  // decimal(15,4)
                $unitCost  = (float) $item->unit_cost;      // decimal(15,4) snapshot
                $qtyAfter  = $qtyBefore + $diff;

                // Recalculate WAC on surplus (barang ditemukan / stock opname lebih)
                $newAvgCost = $avgCost;
                if ($diff > 0 && $qtyAfter > 0) {
                    $newAvgCost = round(
                        (($qtyBefore * $avgCost) + ($diff * $unitCost)) / $qtyAfter,
                        4   // decimal(15,4)
                    );
                }

                $stockUpdate = [
                    'quantity'   => $qtyAfter,                              // bigInteger SIGNED
                    'total_value' => round($qtyAfter * $newAvgCost, 2),     // decimal(15,2)
                ];
                if ($diff > 0) {
                    $stockUpdate['average_cost'] = $newAvgCost;             // decimal(15,4)
                    $stockUpdate['last_in_at']   = $now;
                    $stockUpdate['last_in_by']   = $userId;
                    $stockUpdate['last_in_qty']  = $diff;
                } else {
                    $stockUpdate['last_out_at']  = $now;
                    $stockUpdate['last_out_by']  = $userId;
                    $stockUpdate['last_out_qty'] = abs($diff);
                }
                $stock->update($stockUpdate);

                // ★ Sesuai migration 007: qty_change / qty_before / qty_after
                // unit_cost → decimal(15,4), total_cost → decimal(15,2)
                // reference_type → FQCN, tidak ada stockable_type/stockable_id
                StockMovement::create([
                    'location_type'    => $adj->location_type,
                    'location_id'      => $adj->location_id,
                    'item_type'        => $item->item_type,
                    'item_id'          => $item->item_id,
                    'movement_type'    => $this->resolveMovementType($adj->type, $diff),
                    'qty_change'       => $diff,                                    // bigInteger SIGNED
                    'qty_before'       => $qtyBefore,
                    'qty_after'        => $qtyAfter,
                    'unit_cost'        => $unitCost,                                // decimal(15,4)
                    'total_cost'       => round(abs($diff) * $unitCost, 2),         // decimal(15,2)
                    'avg_cost_before'  => $avgCost,                                 // decimal(15,4)
                    'avg_cost_after'   => $newAvgCost,                              // decimal(15,4)
                    'reference_type'   => StockAdjustment::class,
                    'reference_id'     => $adj->id,
                    'reference_number' => $adj->adjustment_number,
                    'movement_date'    => $adj->adjustment_date,
                    'notes'            => "[{$adj->type_label}] {$adj->adjustment_number}"
                        . ($item->notes ? " — {$item->notes}" : ''),
                    'created_by'       => $userId,
                ]);
            }

            $adj->update(['status' => 'completed']);
        });

        return to_route('stock-adjustments.show', $id)
            ->with('success', 'Adjustment selesai! Stok telah diperbarui.');
    }

    // ─── Workflow: cancel ─────────────────────────────────────────────────────────

    public function cancel(Request $request, string $id)
    {
        $adj = StockAdjustment::findOrFail($id);
        if (! $adj->canCancel()) {
            return back()->withErrors(['status' => 'Adjustment tidak dapat dibatalkan dari status ini.']);
        }
        $adj->update([
            'status'               => 'cancelled',
            'cancellation_reason'  => $request->reason ?? null,
        ]);
        return to_route('stock-adjustments.index')->with('success', 'Adjustment dibatalkan.');
    }

    // ─── Destroy ─────────────────────────────────────────────────────────────────

    public function destroy(string $id)
    {
        $adj = StockAdjustment::findOrFail($id);
        if ($adj->status !== 'draft') {
            return back()->withErrors(['delete' => 'Hanya draft yang dapat dihapus.']);
        }
        $adj->delete();
        return to_route('stock-adjustments.index')->with('success', 'Draft adjustment dihapus.');
    }

    // ─── AJAX: current stock ──────────────────────────────────────────────────────

    public function getCurrentStock(Request $request)
    {
        $request->validate([
            'location_type' => 'required|in:warehouse,store',
            'location_id'   => 'required|uuid',
            'item_type'     => 'required|in:ingredient,packaging_material',
            'item_id'       => 'required|uuid',
        ]);

        $stock = $this->findStock(
            $request->location_type, $request->location_id,
            $request->item_type,     $request->item_id
        );

        return response()->json([
            'quantity'     => $stock ? (int)   $stock->quantity     : 0,    // bigInteger
            'average_cost' => $stock ? (float) $stock->average_cost : 0.0,  // decimal(15,4)
        ]);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────────

    private function resolveMovementType(string $adjType, int $diff): string
    {
        if ($diff > 0) return 'adjustment_in';
        return match ($adjType) {
            'damage', 'expired' => 'waste',
            default             => 'adjustment_out',
        };
    }

    private function findStock(string $locType, string $locId, string $itemType, string $itemId)
    {
        return match ([$locType, $itemType]) {
            ['warehouse', 'ingredient']         => WarehouseIngredientStock::where('warehouse_id', $locId)->where('ingredient_id', $itemId)->first(),
            ['warehouse', 'packaging_material'] => WarehousePackagingStock::where('warehouse_id', $locId)->where('packaging_material_id', $itemId)->first(),
            ['store', 'ingredient']             => StoreIngredientStock::where('store_id', $locId)->where('ingredient_id', $itemId)->first(),
            ['store', 'packaging_material']     => StorePackagingStock::where('store_id', $locId)->where('packaging_material_id', $itemId)->first(),
            default => null,
        };
    }

    private function createStock(string $locType, string $locId, string $itemType, string $itemId, array $data)
    {
        $base = array_merge(['quantity' => 0, 'average_cost' => 0.0, 'total_value' => 0.0], $data);
        return match ([$locType, $itemType]) {
            ['warehouse', 'ingredient']         => WarehouseIngredientStock::create(array_merge($base, ['warehouse_id' => $locId, 'ingredient_id' => $itemId])),
            ['warehouse', 'packaging_material'] => WarehousePackagingStock::create(array_merge($base, ['warehouse_id' => $locId, 'packaging_material_id' => $itemId])),
            ['store', 'ingredient']             => StoreIngredientStock::create(array_merge($base, ['store_id' => $locId, 'ingredient_id' => $itemId])),
            ['store', 'packaging_material']     => StorePackagingStock::create(array_merge($base, ['store_id' => $locId, 'packaging_material_id' => $itemId])),
        };
    }

    private function locationName(string $type, string $id): string
    {
        return $type === 'warehouse'
            ? (Warehouse::find($id)?->name ?? '-')
            : (Store::find($id)?->name ?? '-');
    }

    private function resolveItem(string $type, string $id): array
    {
        if ($type === 'ingredient') {
            $i = Ingredient::find($id);
            return [$i?->name ?? '-', $i?->code ?? '-', $i?->unit ?? 'unit'];
        }
        $p = PackagingMaterial::with('size')->find($id);
        return [$p?->name ?? '-', $p?->code ?? '-', $p?->size?->name ?? 'pcs'];
    }

    private function resolveItemName(string $type, string $id): string
    {
        if ($type === 'ingredient') return Ingredient::find($id)?->name ?? '-';
        return PackagingMaterial::find($id)?->name ?? '-';
    }

    private function typeOptions(): array
    {
        return [
            ['value' => 'stock_opname', 'label' => 'Stock Opname'],
            ['value' => 'damage',       'label' => 'Barang Rusak'],
            ['value' => 'loss',         'label' => 'Barang Hilang'],
            ['value' => 'found',        'label' => 'Barang Ditemukan'],
            ['value' => 'expired',      'label' => 'Kadaluarsa'],
            ['value' => 'other',        'label' => 'Lainnya'],
        ];
    }
}
