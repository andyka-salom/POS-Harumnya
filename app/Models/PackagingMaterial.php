<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class PackagingMaterial extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'packaging_category_id',
        'unit',
        'code',
        'name',
        'size_id',
        'image',
        'description',
        'is_available_as_addon',
        // Pricing (dari migration 003)
        'purchase_price',
        'selling_price',
        'average_cost',
        // Status
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active'             => 'boolean',
        'is_available_as_addon' => 'boolean',
        'sort_order'            => 'integer',
        'purchase_price'        => 'integer',
        'selling_price'         => 'integer',
        'average_cost'          => 'decimal:4',  // 15,4 di migration
    ];

    protected $appends = ['image_url'];

    // ─── Accessors ──────────────────────────────────────────────────────

    public function getImageUrlAttribute(): ?string
    {
        return $this->image ? Storage::url($this->image) : null;
    }

    /**
     * Margin jual vs biaya rata-rata (dalam %)
     * Dipakai di tabel Index untuk info profitabilitas
     */
    public function getMarginPercentageAttribute(): float
    {
        if (!$this->selling_price || !$this->average_cost) return 0;
        return round((($this->selling_price - $this->average_cost) / $this->selling_price) * 100, 2);
    }

    /**
     * Profit per unit jika dijual sebagai addon
     */
    public function getProfitPerUnitAttribute(): int
    {
        return max(0, $this->selling_price - (int) round($this->average_cost));
    }

    // ─── Relations ──────────────────────────────────────────────────────

    public function category(): BelongsTo
    {
        return $this->belongsTo(PackagingCategory::class, 'packaging_category_id');
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }

    // Stok di tiap warehouse
    public function warehouseStocks(): HasMany
    {
        return $this->hasMany(WarehousePackagingStock::class, 'packaging_material_id');
    }

    // Stok di tiap toko
    public function storeStocks(): HasMany
    {
        return $this->hasMany(StorePackagingStock::class, 'packaging_material_id');
    }

    // ─── Scopes ─────────────────────────────────────────────────────────

    public function scopeSearch($query, string $search)
    {
        return $query->where(fn($q) =>
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('code', 'like', "%{$search}%")
        );
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAvailableAsAddon($query)
    {
        return $query->where('is_active', true)
                     ->where('is_available_as_addon', true);
    }

    // ─── WAC Update Helper ───────────────────────────────────────────────

    /**
     * Update average_cost dengan formula WAC saat purchase diterima.
     * Dipanggil dari PurchaseController::receive()
     *
     * @param int   $qtyReceived   Jumlah yang diterima dari PO
     * @param int   $purchasePrice Harga beli per unit di PO ini
     * @param float $currentStock  Stok total SEBELUM penambahan ini
     */
    public function updateAverageCost(int $qtyReceived, int $purchasePrice, float $currentStock): void
    {
        $oldCost    = (float) $this->average_cost;   // WAC lama
        $oldQty     = $currentStock;                 // Stok sebelum terima

        if (($oldQty + $qtyReceived) <= 0) return;

        // WAC = (stok_lama × cost_lama + qty_baru × harga_beli_baru) / (stok_lama + qty_baru)
        $newAvgCost = (($oldQty * $oldCost) + ($qtyReceived * $purchasePrice))
                    / ($oldQty + $qtyReceived);

        $this->update([
            'average_cost'  => round($newAvgCost, 4),
            'purchase_price' => $purchasePrice,      // update juga harga beli standar
        ]);
    }
}
