<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Ingredient;
use App\Models\PackagingMaterial;
use App\Models\Warehouse;
use App\Models\Store;
use App\Models\WarehouseIngredientStock;
use App\Models\WarehousePackagingStock;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;

class PurchaseController extends Controller
{
    // ─── Index ────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $purchases = Purchase::query()
            ->with(['supplier:id,name,code', 'creator:id,name', 'items'])
            ->when($request->search, fn ($q, $s) =>
                $q->where('purchase_number', 'like', "%{$s}%")
                  ->orWhereHas('supplier', fn ($q) => $q->where('name', 'like', "%{$s}%"))
            )
            ->when($request->status,           fn ($q, $s) => $q->where('status', $s))
            ->when($request->destination_type, fn ($q, $t) => $q->where('destination_type', $t))
            ->latest('purchase_date')->latest('created_at')
            ->paginate(15)->withQueryString();

        $purchases->getCollection()->each(function ($p) {
            $p->destination_name = $this->locationName($p->destination_type, $p->destination_id);
        });

        return Inertia::render('Dashboard/Purchases/Index', [
            'purchases' => $purchases,
            'filters'   => $request->only(['search', 'status', 'destination_type']),
            'summary'   => Purchase::query()->selectRaw("
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
                COUNT(*) FILTER (WHERE status = 'approved')  AS approved,
                COUNT(*) FILTER (WHERE status = 'received')  AS received,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed
            ")->first(),
        ]);
    }

    // ─── Create ───────────────────────────────────────────────────────────────

    public function create()
    {
        return Inertia::render('Dashboard/Purchases/Create', $this->formData());
    }

    // ─── Store ────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $v = $this->validateStore($request);

        DB::transaction(function () use ($v) {
            $purchase = Purchase::create([
                'purchase_number'        => Purchase::generateNumber(),
                'supplier_id'            => $v['supplier_id'],
                'destination_type'       => $v['destination_type'],
                'destination_id'         => $v['destination_id'],
                'purchase_date'          => $v['purchase_date'],
                'expected_delivery_date' => $v['expected_delivery_date'] ?? null,
                'status'                 => 'draft',
                // ★ decimal(15,2): simpan sebagai string numerik agar presisi terjaga
                'tax'           => $v['tax']           ?? '0',
                'discount'      => $v['discount']      ?? '0',
                'shipping_cost' => $v['shipping_cost'] ?? '0',
                'notes'         => $v['notes'] ?? null,
                'created_by'    => auth()->id(),
            ]);

            [$subtotal] = $this->upsertItems($purchase, $v['items']);

            $total = bcadd(
                bcsub(
                    bcadd($subtotal, (string) ($v['tax'] ?? 0), 2),
                    (string) ($v['discount'] ?? 0),
                    2
                ),
                (string) ($v['shipping_cost'] ?? 0),
                2
            );

            // Jika kolom masih bigint, simpan sebagai integer
            $colType = \Illuminate\Support\Facades\Schema::getColumnType('purchases', 'subtotal');
            if (str_contains($colType, 'int')) {
                $purchase->update(['subtotal' => (int) round((float) $subtotal), 'total' => (int) round((float) $total)]);
            } else {
                $purchase->update(['subtotal' => $subtotal, 'total' => $total]);
            }
        });

        return to_route('purchases.index')
            ->with('success', 'Purchase Order berhasil disimpan sebagai draft!');
    }

    // ─── Show ─────────────────────────────────────────────────────────────────

    public function show(string $id)
    {
        $purchase = Purchase::with([
            'items',
            'supplier',
            'creator:id,name',
            'approver:id,name',
            'receiver:id,name',
        ])->findOrFail($id);

        $purchase->destination_name = $this->locationName(
            $purchase->destination_type,
            $purchase->destination_id
        );

        $purchase->items->each(function ($item) {
            [$name, $code, $unit] = $this->resolveItem($item->item_type, $item->item_id);
            $item->item_name = $name;
            $item->item_code = $code;
            $item->item_unit = $unit;
        });

        $movements = StockMovement::where('reference_id', $purchase->id)
            ->with('creator:id,name')
            ->orderBy('created_at')
            ->get()
            ->each(function ($m) {
                $m->item_name     = $this->resolveItemName($m->item_type, $m->item_id);
                $m->location_name = $this->locationName($m->location_type, $m->location_id);
            });

        return Inertia::render('Dashboard/Purchases/Show', [
            'purchase'  => $purchase,
            'movements' => $movements,
        ]);
    }

    // ─── Edit ─────────────────────────────────────────────────────────────────

    public function edit(string $id)
    {
        $purchase = Purchase::with('items')->findOrFail($id);

        if (! $purchase->canEdit()) {
            return back()->withErrors(['edit' => 'Purchase yang sudah diproses tidak dapat diedit.']);
        }

        $purchase->destination_name = $this->locationName(
            $purchase->destination_type,
            $purchase->destination_id
        );

        return Inertia::render('Dashboard/Purchases/Edit', array_merge(
            ['purchase' => $purchase],
            $this->formData()
        ));
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    public function update(Request $request, string $id)
    {
        $purchase = Purchase::findOrFail($id);

        if (! $purchase->canEdit()) {
            return back()->withErrors(['edit' => 'Purchase yang sudah diproses tidak dapat diedit.']);
        }

        $v = $this->validateUpdate($request);

        // Kembalikan destination dari model — tidak boleh diubah via form
        $v['destination_type'] = $purchase->destination_type;
        $v['destination_id']   = $purchase->destination_id;

        DB::transaction(function () use ($purchase, $v) {
            $purchase->update([
                'supplier_id'            => $v['supplier_id'],
                'purchase_date'          => $v['purchase_date'],
                'expected_delivery_date' => $v['expected_delivery_date'] ?? null,
                'tax'           => $v['tax']           ?? '0',
                'discount'      => $v['discount']      ?? '0',
                'shipping_cost' => $v['shipping_cost'] ?? '0',
                'notes'         => $v['notes'] ?? null,
                // destination_type & destination_id tidak boleh diubah setelah dibuat
            ]);

            $purchase->items()->delete();
            [$subtotal] = $this->upsertItems($purchase, $v['items']);

            $total = bcadd(
                bcsub(
                    bcadd($subtotal, (string) ($v['tax'] ?? 0), 2),
                    (string) ($v['discount'] ?? 0),
                    2
                ),
                (string) ($v['shipping_cost'] ?? 0),
                2
            );

            $colType = \Illuminate\Support\Facades\Schema::getColumnType('purchases', 'subtotal');
            if (str_contains($colType, 'int')) {
                $purchase->update(['subtotal' => (int) round((float) $subtotal), 'total' => (int) round((float) $total)]);
            } else {
                $purchase->update(['subtotal' => $subtotal, 'total' => $total]);
            }
        });

        return to_route('purchases.show', $id)
            ->with('success', 'Purchase Order berhasil diperbarui!');
    }

    // ─── Workflow: submit ─────────────────────────────────────────────────────

    public function submit(string $id)
    {
        $purchase = Purchase::findOrFail($id);

        if (! $purchase->canSubmit()) {
            return back()->withErrors(['status' => 'Hanya draft yang dapat diajukan.']);
        }

        $purchase->update(['status' => 'pending']);

        return back()->with('success', 'Purchase Order diajukan untuk approval.');
    }

    // ─── Workflow: approve ────────────────────────────────────────────────────

    public function approve(string $id)
    {
        $purchase = Purchase::findOrFail($id);

        if (! $purchase->canApprove()) {
            return back()->withErrors(['status' => 'Purchase Order tidak dapat disetujui.']);
        }

        $purchase->update([
            'status'      => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Purchase Order disetujui.');
    }

    // ─── Workflow: receive ────────────────────────────────────────────────────

    public function receive(Request $request, string $id)
    {
        $purchase = Purchase::findOrFail($id);

        if (! $purchase->canReceive()) {
            return back()->withErrors(['status' => 'Purchase Order tidak dapat di-receive.']);
        }

        $request->validate([
            'actual_delivery_date' => 'nullable|date',
        ]);

        $purchase->update([
            'status'               => 'received',
            'received_by'          => auth()->id(),
            'received_at'          => now(),
            'actual_delivery_date' => $request->actual_delivery_date ?? today(),
        ]);

        return back()->with('success', 'Barang diterima. Silakan selesaikan PO untuk memperbarui stok.');
    }

    // ─── Workflow: complete (STOCK + WAC + MOVEMENT) ──────────────────────────

    public function complete(string $id)
    {
        $purchase = Purchase::with(['items', 'supplier'])->findOrFail($id);

        if (! $purchase->canComplete()) {
            return back()->withErrors(['status' => 'Purchase Order tidak dapat diselesaikan.']);
        }

        DB::transaction(function () use ($purchase) {
            $userId = auth()->id();
            $now    = now();

            foreach ($purchase->items as $item) {
                // ★ quantity: integer signed (bisa negatif untuk retur)
                $qty       = (int) $item->quantity;
                // ★ unit_price: decimal(15,2) — pertahankan sebagai float/string untuk bcmath
                $unitPrice = (float) $item->unit_price;

                $stock = $this->findOrCreateStock(
                    $purchase->destination_type,
                    $purchase->destination_id,
                    $item->item_type,
                    $item->item_id,
                    $unitPrice
                );

                $qtyBefore = (int)   $stock->quantity;
                $avgBefore = (float) $stock->average_cost;
                $qtyAfter  = $qtyBefore + $qty;

                // WAC — average_cost di stock tables: decimal(15,4)
                if ($qtyAfter > 0) {
                    $newAvgCost = round(
                        (($qtyBefore * $avgBefore) + ($qty * $unitPrice)) / $qtyAfter,
                        4
                    );
                } elseif ($qtyAfter === 0) {
                    $newAvgCost = 0.0;
                } else {
                    // Stok minus (retur melebihi stok) — pertahankan avg lama
                    $newAvgCost = $avgBefore;
                }

                $stock->update([
                    'quantity'     => $qtyAfter,
                    'average_cost' => $newAvgCost,
                    'total_value'  => max(0, round($qtyAfter * $newAvgCost, 2)),
                    'last_in_at'   => $now,
                    'last_in_by'   => $userId,
                    'last_in_qty'  => $qty,
                ]);

                // Sync ke master ingredient / packaging_material
                $this->syncMasterAverageCost($item->item_type, $item->item_id, $newAvgCost);

                StockMovement::create([
                    'location_type'    => $purchase->destination_type,
                    'location_id'      => $purchase->destination_id,
                    'stockable_type'   => get_class($stock),
                    'stockable_id'     => $stock->id,
                    'item_type'        => $item->item_type,
                    'item_id'          => $item->item_id,
                    'movement_type'    => 'purchase_in',
                    'reference_id'     => $purchase->id,
                    'reference_number' => $purchase->purchase_number,
                    'quantity'         => $qty,               // signed integer
                    'unit_cost'        => $unitPrice,         // decimal
                    'stock_before'     => $qtyBefore,
                    'stock_after'      => $qtyAfter,
                    'avg_cost_before'  => $avgBefore,         // decimal(15,4)
                    'avg_cost_after'   => $newAvgCost,        // decimal(15,4)
                    'movement_date'    => $purchase->purchase_date,
                    'notes'            => "PO {$purchase->purchase_number} dari {$purchase->supplier->name}",
                    'created_by'       => $userId,
                ]);
            }

            $purchase->update(['status' => 'completed']);
        });

        return to_route('purchases.show', $id)
            ->with('success', 'Purchase Order selesai! Stok & HPP berhasil diperbarui.');
    }

    // ─── Workflow: cancel ─────────────────────────────────────────────────────

    public function cancel(Request $request, string $id)
    {
        $purchase = Purchase::findOrFail($id);

        if (! $purchase->canCancel()) {
            return back()->withErrors(['status' => 'Purchase Order tidak dapat dibatalkan.']);
        }

        $request->validate([
            'reason' => 'nullable|string|max:1000',
        ]);

        $purchase->update([
            'status'              => 'cancelled',
            'cancellation_reason' => $request->reason ?? null,
        ]);

        return to_route('purchases.index')
            ->with('success', 'Purchase Order dibatalkan.');
    }

    // ─── Destroy (draft only) ─────────────────────────────────────────────────

    public function destroy(string $id)
    {
        $purchase = Purchase::findOrFail($id);

        if ($purchase->status !== 'draft') {
            return back()->withErrors(['delete' => 'Hanya draft yang dapat dihapus.']);
        }

        $purchase->delete(); // softDeletes

        return to_route('purchases.index')
            ->with('success', 'Draft Purchase Order dihapus.');
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Data dropdown yang dipakai di Create & Edit.
     */
    private function formData(): array
    {
        return [
            'suppliers'          => Supplier::where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'code', 'payment_term', 'credit_limit']),
            'warehouses'         => Warehouse::where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'code']),
            'stores'             => Store::where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'code']),
            'ingredients'        => Ingredient::where('is_active', true)
                ->with('category:id,name')
                ->orderBy('sort_order')->orderBy('name')
                ->get(['id', 'name', 'code', 'unit', 'ingredient_category_id', 'average_cost']),
            'packagingMaterials' => PackagingMaterial::where('is_active', true)
                ->with(['category:id,name', 'size:id,name'])
                ->orderBy('sort_order')->orderBy('name')
                ->get(['id', 'name', 'code', 'packaging_category_id', 'size_id', 'purchase_price', 'average_cost']),
        ];
    }

    /**
     * Validasi request untuk store & update.
     *
     * ★ unit_price & money fields: numeric (bukan integer) karena migration
     *   006 menggunakan decimal(15,2) — support Rp 12.000,59.
     * ★ quantity: integer signed (negatif = retur ke supplier).
     */
    /**
     * Rules dasar yang dipakai oleh store() maupun update().
     */
    private function baseRules(): array
    {
        return [
            'supplier_id'            => 'required|uuid|exists:suppliers,id',
            'purchase_date'          => 'required|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:purchase_date',
            'tax'                    => 'nullable|numeric|min:0',
            'discount'               => 'nullable|numeric|min:0',
            'shipping_cost'          => 'nullable|numeric|min:0',
            'notes'                  => 'nullable|string|max:2000',
            'items'                  => 'required|array|min:1',
            'items.*.item_type'      => 'required|in:ingredient,packaging_material',
            'items.*.item_id'        => 'required|uuid',
            'items.*.quantity'       => 'required|integer|not_in:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.notes'          => 'nullable|string|max:500',
        ];
    }

    /**
     * Validasi untuk store() — destination wajib ada.
     */
    private function validateStore(Request $request): array
    {
        return $request->validate(array_merge($this->baseRules(), [
            'destination_type' => 'required|in:warehouse,store',
            'destination_id'   => 'required|uuid',
        ]));
    }

    /**
     * Validasi untuk update() — destination TIDAK dikirim dari form (read-only).
     * Ambil destination dari model yang sudah ada.
     */
    private function validateUpdate(Request $request): array
    {
        return $request->validate($this->baseRules());
    }

    /**
     * Insert items, hitung & kembalikan subtotal sebagai string bcmath.
     *
     * @return array{0: string}  [ subtotal_string ]
     */
    private function upsertItems(Purchase $purchase, array $items): array
    {
        $subtotal = '0';

        // Cek tipe kolom sekali saja (bukan per-item) untuk kompatibilitas
        // migration lama (unsignedBigInteger) vs migration 006 (decimal 15,2).
        $colType   = \Illuminate\Support\Facades\Schema::getColumnType('purchase_items', 'unit_price');
        $isInteger = str_contains($colType, 'int');

        foreach ($items as $item) {
            $qty      = (int) $item['quantity'];
            $rawPrice = (float) $item['unit_price'];

            // Bigint column  → bulatkan ke integer
            // Decimal column → pertahankan 2 desimal
            $unitPrice = $isInteger ? (int) round($rawPrice) : round($rawPrice, 2);
            $lineTotal = $isInteger ? (int) round($qty * $unitPrice) : round($qty * $unitPrice, 2);
            $subtotal  = bcadd($subtotal, (string) $lineTotal, 2);

            $purchase->items()->create([
                'item_type'  => $item['item_type'],
                'item_id'    => $item['item_id'],
                'quantity'   => $qty,
                'unit_price' => $unitPrice,
                'subtotal'   => $lineTotal,
                'notes'      => $item['notes'] ?? null,
            ]);
        }

        return [$subtotal];
    }

    /**
     * Cari stock record; buat baru jika belum ada.
     */
    private function findOrCreateStock(
        string $locType,
        string $locId,
        string $itemType,
        string $itemId,
        float  $initialCost = 0.0
    ) {
        $stock = $this->findStock($locType, $locId, $itemType, $itemId);
        if ($stock) return $stock;

        $base = [
            'quantity'     => 0,
            'average_cost' => $initialCost, // decimal(15,4)
            'total_value'  => 0,
        ];

        return match ([$locType, $itemType]) {
            ['warehouse', 'ingredient']         => WarehouseIngredientStock::create(array_merge($base, [
                'warehouse_id'  => $locId,
                'ingredient_id' => $itemId,
            ])),
            ['warehouse', 'packaging_material'] => WarehousePackagingStock::create(array_merge($base, [
                'warehouse_id'          => $locId,
                'packaging_material_id' => $itemId,
            ])),
            ['store', 'ingredient']             => StoreIngredientStock::create(array_merge($base, [
                'store_id'      => $locId,
                'ingredient_id' => $itemId,
            ])),
            ['store', 'packaging_material']     => StorePackagingStock::create(array_merge($base, [
                'store_id'              => $locId,
                'packaging_material_id' => $itemId,
            ])),
            default => throw new \InvalidArgumentException(
                "Unknown stock combination: [{$locType}, {$itemType}]"
            ),
        };
    }

    private function findStock(string $locType, string $locId, string $itemType, string $itemId)
    {
        return match ([$locType, $itemType]) {
            ['warehouse', 'ingredient']         =>
                WarehouseIngredientStock::where('warehouse_id', $locId)
                    ->where('ingredient_id', $itemId)->first(),
            ['warehouse', 'packaging_material'] =>
                WarehousePackagingStock::where('warehouse_id', $locId)
                    ->where('packaging_material_id', $itemId)->first(),
            ['store', 'ingredient']             =>
                StoreIngredientStock::where('store_id', $locId)
                    ->where('ingredient_id', $itemId)->first(),
            ['store', 'packaging_material']     =>
                StorePackagingStock::where('store_id', $locId)
                    ->where('packaging_material_id', $itemId)->first(),
            default => null,
        };
    }

    /**
     * Sync average_cost ke tabel master agar HPP selalu tersedia tanpa join.
     *
     * Catatan: jika item ada di beberapa lokasi, master menyimpan WAC PO terakhir.
     * Gunakan aggregate WAC lintas lokasi sebagai future improvement.
     */
    private function syncMasterAverageCost(string $itemType, string $itemId, float $newAvgCost): void
    {
        match ($itemType) {
            'ingredient'         => Ingredient::where('id', $itemId)
                                        ->update(['average_cost' => $newAvgCost]),
            'packaging_material' => PackagingMaterial::where('id', $itemId)
                                        ->update(['average_cost' => $newAvgCost]),
            default              => null,
        };
    }

    private function locationName(string $type, string $id): string
    {
        return $type === 'warehouse'
            ? (Warehouse::find($id)?->name ?? '-')
            : (Store::find($id)?->name     ?? '-');
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
        return $type === 'ingredient'
            ? (Ingredient::find($id)?->name        ?? '-')
            : (PackagingMaterial::find($id)?->name ?? '-');
    }
}
