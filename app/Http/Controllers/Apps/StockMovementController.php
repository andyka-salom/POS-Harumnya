<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Models\Store;

class StockMovementController extends Controller
{
    public function index(Request $request)
    {
        $movements = StockMovement::query()
            ->with('creator:id,name')
            ->when($request->search, fn($q, $s) =>
                $q->where('reference_number', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%")
            )
            ->when($request->movement_type, fn($q, $t) =>
                $q->where('movement_type', $t)
            )
            ->when($request->location_type, fn($q, $t) =>
                $q->where('location_type', $t)
            )
            ->when($request->location_id, fn($q, $id) =>
                $q->where('location_id', $id)
            )
            ->when($request->item_type, fn($q, $t) =>
                $q->where('item_type', $t)
            )
            ->when($request->date_from, fn($q, $d) =>
                $q->whereDate('movement_date', '>=', $d)
            )
            ->when($request->date_to, fn($q, $d) =>
                $q->whereDate('movement_date', '<=', $d)
            )
            ->orderByDesc('movement_date')
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        // Resolve item & location names in one pass
        // ★ direction ditentukan dari qty_change (bukan quantity)
        $movements->getCollection()->transform(function ($m) {
            $m->location_name       = $this->resolveLocationName($m->location_type, $m->location_id);
            $m->item_name           = $this->resolveItemName($m->item_type, $m->item_id);
            $m->movement_type_label = $m->movement_type_label;
            // qty_change positif = masuk, negatif = keluar
            $m->direction           = (int) $m->qty_change > 0 ? 'in' : 'out';
            return $m;
        });

        $allLocations = array_merge(
            Warehouse::where('is_active', true)->get(['id', 'name'])
                ->map(fn($w) => ['id' => $w->id, 'name' => $w->name, 'type' => 'warehouse'])
                ->toArray(),
            Store::where('is_active', true)->get(['id', 'name'])
                ->map(fn($s) => ['id' => $s->id, 'name' => $s->name, 'type' => 'store'])
                ->toArray(),
        );

        return Inertia::render('Dashboard/StockMovements/Index', [
            'movements'     => $movements,
            'locations'     => $allLocations,
            'filters'       => $request->only(['search', 'movement_type', 'location_type', 'location_id', 'item_type', 'date_from', 'date_to']),
            'movementTypes' => $this->movementTypeOptions(),
            'summary'       => [
                'total'    => StockMovement::count(),
                'today'    => StockMovement::whereDate('movement_date', today())->count(),
                'repack'   => StockMovement::whereIn('movement_type', ['repack_in', 'repack_out'])->count(),
                'transfer' => StockMovement::whereIn('movement_type', ['transfer_in', 'transfer_out'])->count(),
            ],
        ]);
    }

    public function show(string $id)
    {
        $movement = StockMovement::with('creator:id,name')->findOrFail($id);

        $movement->location_name       = $this->resolveLocationName($movement->location_type, $movement->location_id);
        $movement->item_name           = $this->resolveItemName($movement->item_type, $movement->item_id);
        $movement->movement_type_label = $movement->movement_type_label;
        // qty_change positif = masuk
        $movement->direction           = (int) $movement->qty_change > 0 ? 'in' : 'out';

        return Inertia::render('Dashboard/StockMovements/Show', [
            'movement' => $movement,
        ]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private function resolveLocationName(string $type, string $id): string
    {
        if ($type === 'warehouse') return Warehouse::find($id)?->name ?? '-';
        return Store::find($id)?->name ?? '-';
    }

    private function resolveItemName(string $type, string $id): string
    {
        if ($type === 'ingredient') {
            return \App\Models\Ingredient::find($id)?->name ?? '-';
        }
        return \App\Models\PackagingMaterial::find($id)?->name ?? '-';
    }

    private function movementTypeOptions(): array
    {
        return [
            ['value' => 'purchase_in',    'label' => 'Pembelian Masuk'],
            ['value' => 'transfer_in',    'label' => 'Transfer Masuk'],
            ['value' => 'transfer_out',   'label' => 'Transfer Keluar'],
            ['value' => 'repack_in',      'label' => 'Repack Masuk'],
            ['value' => 'repack_out',     'label' => 'Repack Keluar'],
            ['value' => 'production_in',  'label' => 'Produksi Masuk'],
            ['value' => 'production_out', 'label' => 'Produksi Keluar'],
            ['value' => 'sales_out',      'label' => 'Penjualan'],
            ['value' => 'adjustment_in',  'label' => 'Penyesuaian (+)'],
            ['value' => 'adjustment_out', 'label' => 'Penyesuaian (-)'],
            ['value' => 'waste',          'label' => 'Waste/Rusak'],
            ['value' => 'return_in',      'label' => 'Retur Masuk'],
            ['value' => 'return_out',     'label' => 'Retur Keluar'],
        ];
    }
}
