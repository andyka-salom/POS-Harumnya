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
        // Pricing
        'purchase_price',
        'selling_price',
        'is_free',
        'free_condition_note',
        'average_cost',
        // Status
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active'             => 'boolean',
        'is_available_as_addon' => 'boolean',
        'is_free'               => 'boolean',
        'sort_order'            => 'integer',
        'purchase_price'        => 'integer',
        'selling_price'         => 'integer',
        'average_cost'          => 'decimal:4',
    ];

    protected $appends = ['image_url'];

    // ─── Accessors ──────────────────────────────────────────────────────

    public function getImageUrlAttribute(): ?string
    {
        return $this->image ? Storage::url($this->image) : null;
    }

    /**
     * Harga efektif yang ditagih ke pelanggan.
     * Jika is_free = true → 0, meski selling_price terisi.
     */
    public function getEffectiveSellingPriceAttribute(): int
    {
        return $this->is_free ? 0 : (int) $this->selling_price;
    }

    /**
     * Margin jual vs HPP (average_cost).
     * Jika is_free → margin negatif = biaya subsidi kemasan.
     */
    public function getMarginPercentageAttribute(): float
    {
        $avgCost     = (float) $this->average_cost;
        $effectivePrice = $this->effective_selling_price;

        if ($avgCost <= 0) return 0;

        // Jika gratis: margin = -100% dari sisi pendapatan, tapi kita hitung subsidi
        if ($this->is_free) {
            return -100.0;
        }

        if ($effectivePrice <= 0) return 0;

        return round((($effectivePrice - $avgCost) / $effectivePrice) * 100, 2);
    }

    /**
     * Profit (atau biaya subsidi) per unit.
     * Negatif jika is_free (seluruh average_cost jadi beban).
     */
    public function getProfitPerUnitAttribute(): int
    {
        return $this->effective_selling_price - (int) round((float) $this->average_cost);
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

    public function warehouseStocks(): HasMany
    {
        return $this->hasMany(WarehousePackagingStock::class, 'packaging_material_id');
    }

    public function storeStocks(): HasMany
    {
        return $this->hasMany(StorePackagingStock::class, 'packaging_material_id');
    }

    // ─── Scopes ─────────────────────────────────────────────────────────

    public function scopeSearch($query, string $search)
    {
        $term = mb_strtolower($search);

        return $query->where(fn($q) =>
            $q->whereRaw('LOWER(name) LIKE ?', ["%{$term}%"])
              ->orWhereRaw('LOWER(code) LIKE ?', ["%{$term}%"])
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

    public function scopeFree($query)
    {
        return $query->where('is_free', true);
    }

    // ─── WAC Update Helper ───────────────────────────────────────────────

    /**
     * Update average_cost dengan formula WAC saat purchase diterima.
     * average_cost tetap dihitung meski is_free = true → laporan HPP akurat.
     *
     * @param int   $qtyReceived   Jumlah yang diterima dari PO
     * @param int   $purchasePrice Harga beli per unit di PO ini
     * @param float $currentStock  Stok total SEBELUM penambahan ini
     */
    public function updateAverageCost(int $qtyReceived, int $purchasePrice, float $currentStock): void
    {
        $oldCost = (float) $this->average_cost;
        $oldQty  = $currentStock;

        if (($oldQty + $qtyReceived) <= 0) return;

        // WAC = (stok_lama × cost_lama + qty_baru × harga_beli_baru) / (stok_lama + qty_baru)
        $newAvgCost = (($oldQty * $oldCost) + ($qtyReceived * $purchasePrice))
                    / ($oldQty + $qtyReceived);

        $this->update([
            'average_cost'   => round($newAvgCost, 4),
            'purchase_price' => $purchasePrice,
        ]);
    }
}
