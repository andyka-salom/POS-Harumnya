<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Models\RepackTransaction;
use App\Models\RepackTransactionItem;
use App\Models\StockMovement;
use App\Models\Ingredient;
use App\Models\Warehouse;
use App\Models\Store;
use App\Models\WarehouseIngredientStock;
use App\Models\StoreIngredientStock;

class RepackController extends Controller
{
    // ─── Index ───────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $repacks = RepackTransaction::query()
            ->with([
                'outputIngredient:id,name,code,unit',   // relasi pakai output_ingredient_id
                'creator:id,name',
                'approver:id,name',
                'items',
            ])
            ->when($request->search, fn($q, $s) =>
                $q->where('repack_number', 'like', "%{$s}%")
                  ->orWhereHas('outputIngredient', fn($q) =>
                      $q->where('name', 'like', "%{$s}%")
                  )
            )
            ->when($request->status,        fn($q, $s) => $q->where('status', $s))
            ->when($request->location_type, fn($q, $t) => $q->where('location_type', $t))
            ->latest('repack_date')
            ->paginate(15)
            ->withQueryString();

        // Enrich dengan location name & total_input_cost
        $repacks->getCollection()->transform(function ($r) {
            $r->location_name    = $this->resolveLocationName($r->location_type, $r->location_id);
            // total_cost kini decimal(15,2) → float sum
            $r->total_input_cost = (float) $r->items->sum('total_cost');
            return $r;
        });

        return Inertia::render('Dashboard/Repacks/Index', [
            'repacks' => $repacks,
            'filters' => $request->only(['search', 'status', 'location_type']),
            'summary' => [
                'total'     => RepackTransaction::count(),
                'draft'     => RepackTransaction::where('status', 'draft')->count(),
                'pending'   => RepackTransaction::where('status', 'pending')->count(),
                'completed' => RepackTransaction::where('status', 'completed')->count(),
                'cancelled' => RepackTransaction::where('status', 'cancelled')->count(),
            ],
        ]);
    }

    // ─── Create ──────────────────────────────────────────────────────────────────

    public function create()
    {
        return Inertia::render('Dashboard/Repacks/Create', [
            'warehouses'  => Warehouse::where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'code']),
            'stores'      => Store::where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'code']),
            'ingredients' => Ingredient::where('is_active', true)
                ->with('category:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'unit', 'ingredient_category_id']),
        ]);
    }

    // ─── Store (simpan draft) ─────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $validated = $request->validate([
            'location_type'         => 'required|in:warehouse,store',
            'location_id'           => 'required|uuid',
            'repack_ingredient_id'  => 'required|uuid|exists:ingredients,id', // nama field form (bebas)
            'output_quantity'       => 'required|integer|min:1',
            'repack_date'           => 'required|date',
            'notes'                 => 'nullable|string|max:1000',
            'items'                 => 'required|array|min:1',
            'items.*.ingredient_id' => 'required|uuid|exists:ingredients,id',
            'items.*.quantity'      => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($validated) {
            $userId = auth()->id();

            // Hitung unit_cost & total_cost tiap item dari WAC saat ini
            $items = collect($validated['items'])->map(function ($item) use ($validated) {
                $stock    = $this->findStock(
                    $validated['location_type'],
                    $validated['location_id'],
                    $item['ingredient_id']
                );
                // unit_cost → decimal(15,4): ambil WAC float
                $unitCost  = $stock ? (float) $stock->average_cost : 0.0;
                $qty       = (int) $item['quantity'];
                // total_cost → decimal(15,2): rupiah dengan 2 desimal
                $totalCost = round($qty * $unitCost, 2);

                return [
                    'ingredient_id' => $item['ingredient_id'],
                    'quantity'      => $qty,        // bigInteger SIGNED
                    'unit_cost'     => $unitCost,   // decimal(15,4)
                    'total_cost'    => $totalCost,  // decimal(15,2)
                ];
            });

            // output_cost → decimal(15,4): total input / qty output
            $totalInputCost = (float) $items->sum('total_cost');
            $outputQty      = (int) $validated['output_quantity'];
            $outputCost     = $outputQty > 0
                ? round($totalInputCost / $outputQty, 4)
                : 0.0;

            $repack = RepackTransaction::create([
                'repack_number'        => RepackTransaction::generateNumber(),
                'location_type'        => $validated['location_type'],
                'location_id'          => $validated['location_id'],
                'output_ingredient_id' => $validated['repack_ingredient_id'], // ← FIXED: kolom DB = output_ingredient_id
                'output_quantity'      => $outputQty,    // bigInteger SIGNED
                'output_cost'          => $outputCost,   // decimal(15,4)
                'repack_date'          => $validated['repack_date'],
                'status'               => 'draft',
                'notes'                => $validated['notes'] ?? null,
                'created_by'           => $userId,
            ]);

            foreach ($items as $item) {
                $repack->items()->create($item);
            }
        });

        return to_route('repacks.index')
            ->with('success', 'Repack berhasil disimpan sebagai draft!');
    }

    // ─── Show ────────────────────────────────────────────────────────────────────

    public function show(string $id)
    {
        $repack = RepackTransaction::with([
            'outputIngredient:id,name,code,unit',   // ← FIXED: relasi outputIngredient
            'items.ingredient:id,name,code,unit',
            'creator:id,name',
            'approver:id,name',
        ])->findOrFail($id);

        $repack->location_name = $this->resolveLocationName(
            $repack->location_type,
            $repack->location_id
        );

        // Stok saat ini untuk tiap ingredient input
        $repack->items->each(function ($item) use ($repack) {
            $stock               = $this->findStock(
                $repack->location_type,
                $repack->location_id,
                $item->ingredient_id
            );
            $item->current_stock = $stock ? (int) $stock->quantity : 0;
        });

        // Stok saat ini untuk output ingredient
        $outputStock                   = $this->findStock(
            $repack->location_type,
            $repack->location_id,
            $repack->output_ingredient_id   // ← FIXED
        );
        $repack->output_current_stock  = $outputStock ? (int) $outputStock->quantity : 0;

        // Stock movements — pakai field sesuai migration: qty_change, qty_before, qty_after
        $movements = StockMovement::where('reference_id', $repack->id)
            ->with('creator:id,name')
            ->orderBy('created_at')
            ->get();

        return Inertia::render('Dashboard/Repacks/Show', [
            'repack'    => $repack,
            'movements' => $movements,
        ]);
    }

    // ─── Edit ────────────────────────────────────────────────────────────────────

    public function edit(string $id)
    {
        $repack = RepackTransaction::with([
            'outputIngredient:id,name,code,unit',   // ← FIXED
            'items.ingredient:id,name,code,unit',
        ])->findOrFail($id);

        if (! in_array($repack->status, ['draft', 'pending'])) {
            return back()->withErrors([
                'edit' => 'Hanya repack berstatus draft/pending yang dapat diedit.',
            ]);
        }

        return Inertia::render('Dashboard/Repacks/Edit', [
            'repack'      => $repack,
            'warehouses'  => Warehouse::where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'code']),
            'stores'      => Store::where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'code']),
            'ingredients' => Ingredient::where('is_active', true)
                ->with('category:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'unit', 'ingredient_category_id']),
        ]);
    }

    // ─── Update ──────────────────────────────────────────────────────────────────

    public function update(Request $request, string $id)
    {
        $repack = RepackTransaction::findOrFail($id);

        if (! in_array($repack->status, ['draft', 'pending'])) {
            return back()->withErrors([
                'edit' => 'Hanya repack berstatus draft/pending yang dapat diedit.',
            ]);
        }

        $validated = $request->validate([
            'repack_ingredient_id'  => 'required|uuid|exists:ingredients,id', // nama field form (bebas)
            'output_quantity'       => 'required|integer|min:1',
            'repack_date'           => 'required|date',
            'notes'                 => 'nullable|string|max:1000',
            'items'                 => 'required|array|min:1',
            'items.*.ingredient_id' => 'required|uuid|exists:ingredients,id',
            'items.*.quantity'      => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($repack, $validated) {
            $items = collect($validated['items'])->map(function ($item) use ($repack) {
                $stock    = $this->findStock(
                    $repack->location_type,
                    $repack->location_id,
                    $item['ingredient_id']
                );
                $unitCost  = $stock ? (float) $stock->average_cost : 0.0;
                $qty       = (int) $item['quantity'];
                $totalCost = round($qty * $unitCost, 2); // decimal(15,2)

                return [
                    'ingredient_id' => $item['ingredient_id'],
                    'quantity'      => $qty,
                    'unit_cost'     => $unitCost,
                    'total_cost'    => $totalCost,
                ];
            });

            $totalInputCost = (float) $items->sum('total_cost');
            $outputQty      = (int) $validated['output_quantity'];
            $outputCost     = $outputQty > 0
                ? round($totalInputCost / $outputQty, 4)
                : 0.0;

            $repack->update([
                'output_ingredient_id' => $validated['repack_ingredient_id'], // ← FIXED
                'output_quantity'      => $outputQty,
                'output_cost'          => $outputCost,
                'repack_date'          => $validated['repack_date'],
                'notes'                => $validated['notes'] ?? null,
            ]);

            // Replace semua items
            $repack->items()->delete();
            foreach ($items as $item) {
                $repack->items()->create($item);
            }
        });

        return to_route('repacks.show', $id)
            ->with('success', 'Repack berhasil diperbarui!');
    }

    // ─── Complete ─────────────────────────────────────────────────────────────────
    // Kurangi stok input, tambah stok output, catat stock_movements

    public function complete(string $id)
    {
        $repack = RepackTransaction::with('items.ingredient')->findOrFail($id);

        if (! in_array($repack->status, ['draft', 'pending', 'approved'])) {
            return back()->withErrors([
                'complete' => 'Repack tidak dapat diselesaikan dari status ini.',
            ]);
        }

        DB::transaction(function () use ($repack) {
            $userId  = auth()->id();
            $now     = now();
            $locType = $repack->location_type;
            $locId   = $repack->location_id;

            // ── 1. Kurangi stok setiap ingredient input ───────────────────────────
            foreach ($repack->items as $item) {
                $stock = $this->findStock($locType, $locId, $item->ingredient_id);

                if (! $stock) {
                    throw new \Exception(
                        "Stok ingredient {$item->ingredient->name} tidak ditemukan di lokasi ini."
                    );
                }
                if ((int) $stock->quantity < (int) $item->quantity) {
                    throw new \Exception(
                        "Stok {$item->ingredient->name} tidak mencukupi. "
                        . "Tersedia: {$stock->quantity}, dibutuhkan: {$item->quantity}"
                    );
                }

                $qtyBefore     = (int) $stock->quantity;           // bigInteger
                $avgCostBefore = (float) $stock->average_cost;     // decimal(15,4)
                $qtyAfter      = $qtyBefore - (int) $item->quantity;
                // total_value → decimal(15,2)
                $newTotalValue = round($qtyAfter * $avgCostBefore, 2);

                $stock->update([
                    'quantity'     => $qtyAfter,       // bigInteger SIGNED
                    'total_value'  => $newTotalValue,   // decimal(15,2)
                    'last_out_at'  => $now,
                    'last_out_by'  => $userId,
                    'last_out_qty' => (int) $item->quantity,
                ]);

                // Log movement — sesuai migration: qty_change, qty_before, qty_after
                // unit_cost → decimal(15,4), total_cost → decimal(15,2)
                StockMovement::create([
                    'location_type'    => $locType,
                    'location_id'      => $locId,
                    'item_type'        => 'ingredient',
                    'item_id'          => $item->ingredient_id,
                    'movement_type'    => 'repack_out',
                    'qty_change'       => -(int) $item->quantity,              // negatif = keluar
                    'qty_before'       => $qtyBefore,
                    'qty_after'        => $qtyAfter,
                    'unit_cost'        => (float) $item->unit_cost,            // decimal(15,4)
                    'total_cost'       => round((float) $item->total_cost, 2), // decimal(15,2)
                    'avg_cost_before'  => $avgCostBefore,                      // decimal(15,4)
                    'avg_cost_after'   => $avgCostBefore,                      // tidak berubah saat out
                    'reference_type'   => RepackTransaction::class,
                    'reference_id'     => $repack->id,
                    'reference_number' => $repack->repack_number,
                    'movement_date'    => $repack->repack_date,
                    'notes'            => "Repack {$repack->repack_number} — bahan input",
                    'created_by'       => $userId,
                ]);
            }

            // ── 2. Tambah stok output ingredient ─────────────────────────────────
            $outputStock = $this->findStock($locType, $locId, $repack->output_ingredient_id); // ← FIXED

            if (! $outputStock) {
                $outputStock = $this->createStock($locType, $locId, $repack->output_ingredient_id, [ // ← FIXED
                    'quantity'     => 0,
                    'average_cost' => 0.0,
                    'total_value'  => 0.0,
                ]);
            }

            $outQtyBefore = (int)   $outputStock->quantity;        // bigInteger
            $outAvgBefore = (float) $outputStock->average_cost;    // decimal(15,4)
            $addQty       = (int)   $repack->output_quantity;
            $addCost      = (float) $repack->output_cost;          // decimal(15,4)
            $outQtyAfter  = $outQtyBefore + $addQty;

            // Weighted average cost recalculation — tetap decimal(15,4)
            $newAvgCost = $outQtyAfter > 0
                ? round((($outQtyBefore * $outAvgBefore) + ($addQty * $addCost)) / $outQtyAfter, 4)
                : $addCost;

            $outputStock->update([
                'quantity'     => $outQtyAfter,                             // bigInteger
                'average_cost' => $newAvgCost,                              // decimal(15,4)
                'total_value'  => round($outQtyAfter * $newAvgCost, 2),     // decimal(15,2)
                'last_in_at'   => $now,
                'last_in_by'   => $userId,
                'last_in_qty'  => $addQty,
            ]);

            // Total cost movement output = addQty × addCost (decimal(15,2))
            $outTotalCost = round($addQty * $addCost, 2);

            StockMovement::create([
                'location_type'    => $locType,
                'location_id'      => $locId,
                'item_type'        => 'ingredient',
                'item_id'          => $repack->output_ingredient_id,    // ← FIXED
                'movement_type'    => 'repack_in',
                'qty_change'       => $addQty,              // positif = masuk
                'qty_before'       => $outQtyBefore,
                'qty_after'        => $outQtyAfter,
                'unit_cost'        => $addCost,             // decimal(15,4)
                'total_cost'       => $outTotalCost,        // decimal(15,2)
                'avg_cost_before'  => $outAvgBefore,        // decimal(15,4)
                'avg_cost_after'   => $newAvgCost,          // decimal(15,4)
                'reference_type'   => RepackTransaction::class,
                'reference_id'     => $repack->id,
                'reference_number' => $repack->repack_number,
                'movement_date'    => $repack->repack_date,
                'notes'            => "Repack {$repack->repack_number} — hasil output",
                'created_by'       => $userId,
            ]);

            // ── 3. Tandai repack sebagai completed ────────────────────────────────
            $repack->update([
                'status'      => 'completed',
                'approved_by' => $repack->approved_by ?? $userId,
                'approved_at' => $repack->approved_at ?? $now,
            ]);
        });

        return to_route('repacks.show', $id)
            ->with('success', 'Repack berhasil diselesaikan! Stok telah diperbarui.');
    }

    // ─── Cancel ──────────────────────────────────────────────────────────────────

    public function cancel(Request $request, string $id)
    {
        $repack = RepackTransaction::findOrFail($id);

        if (! $repack->canBeCancelled()) {
            return back()->withErrors([
                'cancel' => 'Repack yang sudah selesai tidak dapat dibatalkan.',
            ]);
        }

        $reason = $request->reason ?? '-';

        $repack->update([
            'status' => 'cancelled',
            'notes'  => trim($repack->notes . "\n[Dibatalkan: {$reason}]"),
        ]);

        return to_route('repacks.index')
            ->with('success', 'Repack berhasil dibatalkan.');
    }

    // ─── Destroy (hanya draft) ────────────────────────────────────────────────────

    public function destroy(string $id)
    {
        $repack = RepackTransaction::findOrFail($id);

        if ($repack->status !== 'draft') {
            return back()->withErrors([
                'delete' => 'Hanya repack berstatus draft yang dapat dihapus.',
            ]);
        }

        $repack->delete();

        return to_route('repacks.index')
            ->with('success', 'Repack draft berhasil dihapus.');
    }

    // ─── Private helpers ──────────────────────────────────────────────────────────

    private function findStock(string $locType, string $locId, string $ingredientId)
    {
        if ($locType === 'warehouse') {
            return WarehouseIngredientStock::where('warehouse_id', $locId)
                ->where('ingredient_id', $ingredientId)
                ->first();
        }
        return StoreIngredientStock::where('store_id', $locId)
            ->where('ingredient_id', $ingredientId)
            ->first();
    }

    private function createStock(string $locType, string $locId, string $ingredientId, array $data)
    {
        if ($locType === 'warehouse') {
            return WarehouseIngredientStock::create(array_merge([
                'warehouse_id'  => $locId,
                'ingredient_id' => $ingredientId,
            ], $data));
        }
        return StoreIngredientStock::create(array_merge([
            'store_id'      => $locId,
            'ingredient_id' => $ingredientId,
        ], $data));
    }

    private function resolveLocationName(string $type, string $id): string
    {
        if ($type === 'warehouse') {
            return Warehouse::find($id)?->name ?? '-';
        }
        return Store::find($id)?->name ?? '-';
    }
}
