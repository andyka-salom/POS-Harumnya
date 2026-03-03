<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\StockMovement;
use App\Models\Ingredient;
use App\Models\PackagingMaterial;
use App\Models\Warehouse;
use App\Models\Store;
use App\Models\WarehouseIngredientStock;
use App\Models\WarehousePackagingStock;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;

class StockTransferController extends Controller
{
    // ─── Index ────────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $transfers = StockTransfer::query()
            ->with(['creator:id,name', 'items'])
            ->when($request->search, fn($q, $s) =>
                $q->where('transfer_number', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%")
            )
            ->when($request->status,    fn($q, $s) => $q->where('status', $s))
            ->when($request->from_type, fn($q, $t) => $q->where('from_location_type', $t))
            ->latest('transfer_date')->latest('created_at')
            ->paginate(15)->withQueryString();

        $transfers->getCollection()->each(function ($t) {
            $t->from_name = $this->locationName($t->from_location_type, $t->from_location_id);
            $t->to_name   = $this->locationName($t->to_location_type,   $t->to_location_id);
        });

        return Inertia::render('Dashboard/StockTransfers/Index', [
            'transfers' => $transfers,
            'filters'   => $request->only(['search', 'status', 'from_type']),
            'summary'   => [
                'total'      => StockTransfer::count(),
                'pending'    => StockTransfer::where('status', 'pending')->count(),
                'in_transit' => StockTransfer::where('status', 'in_transit')->count(),
                'completed'  => StockTransfer::where('status', 'completed')->count(),
            ],
        ]);
    }

    // ─── Create ───────────────────────────────────────────────────────────────────

    public function create()
    {
        return Inertia::render('Dashboard/StockTransfers/Create', [
            'warehouses' => Warehouse::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'stores'     => Store::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'stockMap'   => $this->buildStockMap(),
        ]);
    }

    // ─── Store ────────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $v = $request->validate([
            'from_location_type'         => 'required|in:warehouse,store',
            'from_location_id'           => 'required|uuid',
            'to_location_type'           => 'required|in:warehouse,store',
            'to_location_id'             => 'required|uuid',
            'transfer_date'              => 'required|date',
            'expected_arrival_date'      => 'nullable|date|after_or_equal:transfer_date',
            'notes'                      => 'nullable|string|max:2000',
            'items'                      => 'required|array|min:1',
            'items.*.item_type'          => 'required|in:ingredient,packaging_material',
            'items.*.item_id'            => 'required|uuid',
            'items.*.quantity_requested' => 'required|integer|min:1',
            'items.*.notes'              => 'nullable|string|max:500',
        ]);

        if ($v['from_location_type'] === $v['to_location_type'] && $v['from_location_id'] === $v['to_location_id']) {
            return back()->withErrors(['to_location_id' => 'Lokasi asal dan tujuan tidak boleh sama.']);
        }

        // Validasi: qty diminta tidak boleh melebihi stok tersedia
        foreach ($v['items'] as $idx => $item) {
            $stock     = $this->findStock($v['from_location_type'], $v['from_location_id'], $item['item_type'], $item['item_id']);
            $available = $stock ? (int) $stock->quantity : 0;
            if ((int) $item['quantity_requested'] > $available) {
                $name = $this->resolveItemName($item['item_type'], $item['item_id']);
                return back()->withErrors(["items.{$idx}.quantity_requested" => "Stok {$name} tidak mencukupi. Tersedia: {$available}"]);
            }
        }

        DB::transaction(function () use ($v) {
            $transfer = StockTransfer::create([
                'transfer_number'       => StockTransfer::generateNumber(),
                'from_location_type'    => $v['from_location_type'],
                'from_location_id'      => $v['from_location_id'],
                'to_location_type'      => $v['to_location_type'],
                'to_location_id'        => $v['to_location_id'],
                'transfer_date'         => $v['transfer_date'],
                'expected_arrival_date' => $v['expected_arrival_date'] ?? null,
                'status'                => 'draft',
                'notes'                 => $v['notes'] ?? null,
                'created_by'            => auth()->id(),
            ]);

            foreach ($v['items'] as $item) {
                $stock    = $this->findStock($v['from_location_type'], $v['from_location_id'], $item['item_type'], $item['item_id']);
                // unit_cost → decimal(15,4): WAC snapshot
                $unitCost = $stock ? (float) $stock->average_cost : 0.0;
                $transfer->items()->create([
                    'item_type'          => $item['item_type'],
                    'item_id'            => $item['item_id'],
                    'quantity_requested' => (int) $item['quantity_requested'], // bigInteger SIGNED
                    'quantity_sent'      => 0,
                    'quantity_received'  => 0,
                    'unit_cost'          => $unitCost,                         // decimal(15,4)
                    'notes'              => $item['notes'] ?? null,
                ]);
            }
        });

        return to_route('stock-transfers.index')
            ->with('success', 'Transfer berhasil disimpan sebagai draft!');
    }

    // ─── Show ─────────────────────────────────────────────────────────────────────

    public function show(string $id)
    {
        $transfer = StockTransfer::with([
            'items', 'creator:id,name', 'approver:id,name',
            'sender:id,name', 'receiver:id,name',
        ])->findOrFail($id);

        $transfer->from_name = $this->locationName($transfer->from_location_type, $transfer->from_location_id);
        $transfer->to_name   = $this->locationName($transfer->to_location_type,   $transfer->to_location_id);

        $transfer->items->each(function ($item) use ($transfer) {
            [$name, $code, $unit] = $this->resolveItem($item->item_type, $item->item_id);
            $item->item_name    = $name;
            $item->item_code    = $code;
            $item->item_unit    = $unit;
            $stock              = $this->findStock($transfer->from_location_type, $transfer->from_location_id, $item->item_type, $item->item_id);
            $item->source_stock = $stock ? (int) $stock->quantity : 0;
        });

        // Movements — menggunakan field qty_change/qty_before/qty_after sesuai migration
        $movements = StockMovement::where('reference_id', $transfer->id)
            ->with('creator:id,name')
            ->orderBy('created_at')
            ->get()
            ->each(function ($m) {
                $m->item_name     = $this->resolveItemName($m->item_type, $m->item_id);
                $m->location_name = $this->locationName($m->location_type, $m->location_id);
            });

        return Inertia::render('Dashboard/StockTransfers/Show', [
            'transfer'  => $transfer,
            'movements' => $movements,
        ]);
    }

    // ─── Edit ─────────────────────────────────────────────────────────────────────

    public function edit(string $id)
    {
        $transfer = StockTransfer::with('items')->findOrFail($id);
        if (! $transfer->canEdit()) {
            return back()->withErrors(['edit' => 'Transfer yang sudah diproses tidak dapat diedit.']);
        }

        $transfer->items->each(function ($item) use ($transfer) {
            [$name, $code, $unit] = $this->resolveItem($item->item_type, $item->item_id);
            $item->item_name    = $name;
            $item->item_code    = $code;
            $item->item_unit    = $unit;
            $stock              = $this->findStock($transfer->from_location_type, $transfer->from_location_id, $item->item_type, $item->item_id);
            $item->source_stock = $stock ? (int) $stock->quantity : 0;
        });

        return Inertia::render('Dashboard/StockTransfers/Edit', [
            'transfer'   => $transfer,
            'warehouses' => Warehouse::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'stores'     => Store::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'stockMap'   => $this->buildStockMap(),
        ]);
    }

    // ─── Update ───────────────────────────────────────────────────────────────────

    public function update(Request $request, string $id)
    {
        $transfer = StockTransfer::findOrFail($id);
        if (! $transfer->canEdit()) {
            return back()->withErrors(['edit' => 'Transfer yang sudah diproses tidak dapat diedit.']);
        }

        $v = $request->validate([
            'transfer_date'              => 'required|date',
            'expected_arrival_date'      => 'nullable|date|after_or_equal:transfer_date',
            'notes'                      => 'nullable|string|max:2000',
            'items'                      => 'required|array|min:1',
            'items.*.item_type'          => 'required|in:ingredient,packaging_material',
            'items.*.item_id'            => 'required|uuid',
            'items.*.quantity_requested' => 'required|integer|min:1',
            'items.*.notes'              => 'nullable|string|max:500',
        ]);

        foreach ($v['items'] as $idx => $item) {
            $stock     = $this->findStock($transfer->from_location_type, $transfer->from_location_id, $item['item_type'], $item['item_id']);
            $available = $stock ? (int) $stock->quantity : 0;
            if ((int) $item['quantity_requested'] > $available) {
                $name = $this->resolveItemName($item['item_type'], $item['item_id']);
                return back()->withErrors(["items.{$idx}.quantity_requested" => "Stok {$name} tidak mencukupi. Tersedia: {$available}"]);
            }
        }

        DB::transaction(function () use ($transfer, $v) {
            $transfer->update([
                'transfer_date'         => $v['transfer_date'],
                'expected_arrival_date' => $v['expected_arrival_date'] ?? null,
                'notes'                 => $v['notes'] ?? null,
            ]);
            $transfer->items()->delete();
            foreach ($v['items'] as $item) {
                $stock    = $this->findStock($transfer->from_location_type, $transfer->from_location_id, $item['item_type'], $item['item_id']);
                $unitCost = $stock ? (float) $stock->average_cost : 0.0;
                $transfer->items()->create([
                    'item_type'          => $item['item_type'],
                    'item_id'            => $item['item_id'],
                    'quantity_requested' => (int) $item['quantity_requested'],
                    'quantity_sent'      => 0,
                    'quantity_received'  => 0,
                    'unit_cost'          => $unitCost,
                    'notes'              => $item['notes'] ?? null,
                ]);
            }
        });

        return to_route('stock-transfers.show', $id)
            ->with('success', 'Transfer berhasil diperbarui!');
    }

    // ─── Workflow: submit ─────────────────────────────────────────────────────────

    public function submit(string $id)
    {
        $transfer = StockTransfer::findOrFail($id);
        if ($transfer->status !== 'draft') {
            return back()->withErrors(['status' => 'Hanya draft yang dapat diajukan.']);
        }
        $transfer->update(['status' => 'pending']);
        return back()->with('success', 'Transfer diajukan untuk approval.');
    }

    // ─── Workflow: approve ────────────────────────────────────────────────────────

    public function approve(string $id)
    {
        $transfer = StockTransfer::findOrFail($id);
        if (! $transfer->canApprove()) {
            return back()->withErrors(['status' => 'Transfer tidak dapat disetujui.']);
        }
        $transfer->update([
            'status'      => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);
        return back()->with('success', 'Transfer disetujui.');
    }

    // ─── Workflow: send (approved → in_transit) ───────────────────────────────────

    public function send(Request $request, string $id)
    {
        $transfer = StockTransfer::with('items')->findOrFail($id);
        if (! $transfer->canSend()) {
            return back()->withErrors(['status' => 'Transfer tidak dapat dikirim dari status ini.']);
        }

        $request->validate([
            'items'                 => 'required|array',
            'items.*.id'            => 'required|uuid',
            'items.*.quantity_sent' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($transfer, $request) {
            $now        = now();
            $userId     = auth()->id();
            $sentQtyMap = collect($request->items)->keyBy('id');

            foreach ($transfer->items as $item) {
                $sentQty = (int) ($sentQtyMap[$item->id]['quantity_sent'] ?? $item->quantity_requested);

                if ($sentQty <= 0) {
                    $item->update(['quantity_sent' => 0]);
                    continue;
                }

                $stock = $this->findStock(
                    $transfer->from_location_type, $transfer->from_location_id,
                    $item->item_type, $item->item_id
                );
                if (! $stock) {
                    throw new \Exception("Stok {$item->item_name} tidak ditemukan di lokasi asal.");
                }

                $available = (int) $stock->quantity;
                if ($sentQty > $available) {
                    throw new \Exception("Stok {$item->item_name} tidak mencukupi. Tersedia: {$available}, diminta: {$sentQty}");
                }

                $qtyBefore = (int)   $stock->quantity;       // bigInteger
                $avgCost   = (float) $stock->average_cost;   // decimal(15,4)
                $qtyAfter  = $qtyBefore - $sentQty;

                $stock->update([
                    'quantity'     => $qtyAfter,                            // bigInteger SIGNED
                    'total_value'  => round($qtyAfter * $avgCost, 2),       // decimal(15,2)
                    'last_out_at'  => $now,
                    'last_out_by'  => $userId,
                    'last_out_qty' => $sentQty,
                ]);

                $item->update([
                    'quantity_sent' => $sentQty,
                    'unit_cost'     => $avgCost,    // decimal(15,4): refresh WAC snapshot saat dikirim
                ]);

                // ★ Sesuai migration: qty_change / qty_before / qty_after
                // unit_cost → decimal(15,4), total_cost → decimal(15,2)
                StockMovement::create([
                    'location_type'    => $transfer->from_location_type,
                    'location_id'      => $transfer->from_location_id,
                    'item_type'        => $item->item_type,
                    'item_id'          => $item->item_id,
                    'movement_type'    => 'transfer_out',
                    'qty_change'       => -$sentQty,                        // bigInteger SIGNED, negatif = keluar
                    'qty_before'       => $qtyBefore,
                    'qty_after'        => $qtyAfter,
                    'unit_cost'        => $avgCost,                         // decimal(15,4)
                    'total_cost'       => round($sentQty * $avgCost, 2),    // decimal(15,2)
                    'avg_cost_before'  => $avgCost,                         // decimal(15,4)
                    'avg_cost_after'   => $avgCost,                         // tidak berubah saat out
                    'reference_type'   => StockTransfer::class,
                    'reference_id'     => $transfer->id,
                    'reference_number' => $transfer->transfer_number,
                    'movement_date'    => $transfer->transfer_date,
                    'notes'            => "Transfer {$transfer->transfer_number} → {$this->locationName($transfer->to_location_type, $transfer->to_location_id)}",
                    'created_by'       => $userId,
                ]);
            }

            $transfer->update([
                'status'  => 'in_transit',
                'sent_by' => $userId,
                'sent_at' => $now,
            ]);
        });

        return back()->with('success', 'Transfer dikirim. Stok telah dikurangi dari lokasi asal.');
    }

    // ─── Workflow: receive (in_transit → completed) ───────────────────────────────

    public function receive(Request $request, string $id)
    {
        $transfer = StockTransfer::with('items')->findOrFail($id);
        if (! $transfer->canReceive()) {
            return back()->withErrors(['status' => 'Transfer tidak dapat diterima dari status ini.']);
        }

        $request->validate([
            'items'                     => 'required|array',
            'items.*.id'                => 'required|uuid',
            'items.*.quantity_received' => 'required|integer|min:0',
            'actual_arrival_date'       => 'nullable|date',
        ]);

        DB::transaction(function () use ($transfer, $request) {
            $now    = now();
            $userId = auth()->id();
            $rcvMap = collect($request->items)->keyBy('id');

            foreach ($transfer->items as $item) {
                $rcvQty = (int) ($rcvMap[$item->id]['quantity_received'] ?? $item->quantity_sent);
                $item->update(['quantity_received' => $rcvQty]);

                if ($rcvQty <= 0) continue;

                $destStock = $this->findOrCreateStock(
                    $transfer->to_location_type, $transfer->to_location_id,
                    $item->item_type, $item->item_id
                );

                $qtyBefore  = (int)   $destStock->quantity;        // bigInteger
                $avgBefore  = (float) $destStock->average_cost;    // decimal(15,4)
                $unitCost   = (float) $item->unit_cost;            // decimal(15,4): WAC dari sumber
                $qtyAfter   = $qtyBefore + $rcvQty;

                // Weighted average cost — decimal(15,4)
                $newAvgCost = $qtyAfter > 0
                    ? round((($qtyBefore * $avgBefore) + ($rcvQty * $unitCost)) / $qtyAfter, 4)
                    : $unitCost;

                $destStock->update([
                    'quantity'     => $qtyAfter,                            // bigInteger SIGNED
                    'average_cost' => $newAvgCost,                          // decimal(15,4)
                    'total_value'  => round($qtyAfter * $newAvgCost, 2),    // decimal(15,2)
                    'last_in_at'   => $now,
                    'last_in_by'   => $userId,
                    'last_in_qty'  => $rcvQty,
                ]);

                // ★ Sesuai migration: qty_change / qty_before / qty_after
                StockMovement::create([
                    'location_type'    => $transfer->to_location_type,
                    'location_id'      => $transfer->to_location_id,
                    'item_type'        => $item->item_type,
                    'item_id'          => $item->item_id,
                    'movement_type'    => 'transfer_in',
                    'qty_change'       => $rcvQty,                              // positif = masuk
                    'qty_before'       => $qtyBefore,
                    'qty_after'        => $qtyAfter,
                    'unit_cost'        => $unitCost,                            // decimal(15,4)
                    'total_cost'       => round($rcvQty * $unitCost, 2),        // decimal(15,2)
                    'avg_cost_before'  => $avgBefore,                           // decimal(15,4)
                    'avg_cost_after'   => $newAvgCost,                          // decimal(15,4)
                    'reference_type'   => StockTransfer::class,
                    'reference_id'     => $transfer->id,
                    'reference_number' => $transfer->transfer_number,
                    'movement_date'    => $transfer->transfer_date,
                    'notes'            => "Transfer {$transfer->transfer_number} ← {$this->locationName($transfer->from_location_type, $transfer->from_location_id)}",
                    'created_by'       => $userId,
                ]);
            }

            $transfer->update([
                'status'              => 'completed',
                'received_by'         => $userId,
                'received_at'         => $now,
                'actual_arrival_date' => $request->actual_arrival_date ?? today(),
            ]);
        });

        return to_route('stock-transfers.show', $id)
            ->with('success', 'Transfer diterima. Stok berhasil masuk ke lokasi tujuan!');
    }

    // ─── Workflow: cancel ─────────────────────────────────────────────────────────

    public function cancel(Request $request, string $id)
    {
        $transfer = StockTransfer::findOrFail($id);
        if (! $transfer->canCancel()) {
            return back()->withErrors(['status' => 'Transfer tidak dapat dibatalkan.']);
        }
        $transfer->update([
            'status'               => 'cancelled',
            'cancellation_reason'  => $request->reason ?? null,
        ]);
        return to_route('stock-transfers.index')->with('success', 'Transfer dibatalkan.');
    }

    public function destroy(string $id)
    {
        $transfer = StockTransfer::findOrFail($id);
        if ($transfer->status !== 'draft') {
            return back()->withErrors(['delete' => 'Hanya draft yang dapat dihapus.']);
        }
        $transfer->delete();
        return to_route('stock-transfers.index')->with('success', 'Transfer draft dihapus.');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    /**
     * Build stockMap: { "warehouse:{id}:ingredient:{item_id}" => { qty, avg_cost, ... } }
     * Digunakan frontend untuk filter item yang tersedia dan tampilkan qty stok.
     */
    private function buildStockMap(): array
    {
        $map = [];

        // Warehouse ingredient stocks
        WarehouseIngredientStock::with('ingredient:id,name,code,unit')
            ->where('quantity', '>', 0)->get()
            ->each(function ($s) use (&$map) {
                $map["warehouse:{$s->warehouse_id}:ingredient:{$s->ingredient_id}"] = [
                    'qty'       => (int)   $s->quantity,        // bigInteger
                    'avg_cost'  => (float) $s->average_cost,    // decimal(15,4)
                    'item_id'   => $s->ingredient_id,
                    'item_type' => 'ingredient',
                    'name'      => $s->ingredient?->name ?? '-',
                    'code'      => $s->ingredient?->code ?? '-',
                    'unit'      => $s->ingredient?->unit ?? 'unit',
                ];
            });

        // Warehouse packaging stocks
        WarehousePackagingStock::with(['packagingMaterial:id,name,code,size_id', 'packagingMaterial.size:id,name'])
            ->where('quantity', '>', 0)->get()
            ->each(function ($s) use (&$map) {
                $map["warehouse:{$s->warehouse_id}:packaging_material:{$s->packaging_material_id}"] = [
                    'qty'       => (int)   $s->quantity,
                    'avg_cost'  => (float) $s->average_cost,
                    'item_id'   => $s->packaging_material_id,
                    'item_type' => 'packaging_material',
                    'name'      => $s->packagingMaterial?->name ?? '-',
                    'code'      => $s->packagingMaterial?->code ?? '-',
                    'unit'      => $s->packagingMaterial?->size?->name ?? 'pcs',
                ];
            });

        // Store ingredient stocks
        StoreIngredientStock::with('ingredient:id,name,code,unit')
            ->where('quantity', '>', 0)->get()
            ->each(function ($s) use (&$map) {
                $map["store:{$s->store_id}:ingredient:{$s->ingredient_id}"] = [
                    'qty'       => (int)   $s->quantity,
                    'avg_cost'  => (float) $s->average_cost,
                    'item_id'   => $s->ingredient_id,
                    'item_type' => 'ingredient',
                    'name'      => $s->ingredient?->name ?? '-',
                    'code'      => $s->ingredient?->code ?? '-',
                    'unit'      => $s->ingredient?->unit ?? 'unit',
                ];
            });

        // Store packaging stocks
        StorePackagingStock::with(['packagingMaterial:id,name,code,size_id', 'packagingMaterial.size:id,name'])
            ->where('quantity', '>', 0)->get()
            ->each(function ($s) use (&$map) {
                $map["store:{$s->store_id}:packaging_material:{$s->packaging_material_id}"] = [
                    'qty'       => (int)   $s->quantity,
                    'avg_cost'  => (float) $s->average_cost,
                    'item_id'   => $s->packaging_material_id,
                    'item_type' => 'packaging_material',
                    'name'      => $s->packagingMaterial?->name ?? '-',
                    'code'      => $s->packagingMaterial?->code ?? '-',
                    'unit'      => $s->packagingMaterial?->size?->name ?? 'pcs',
                ];
            });

        return $map;
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

    private function findOrCreateStock(string $locType, string $locId, string $itemType, string $itemId)
    {
        $stock = $this->findStock($locType, $locId, $itemType, $itemId);
        if ($stock) return $stock;

        $base = ['quantity' => 0, 'average_cost' => 0.0, 'total_value' => 0.0];
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
}
