<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'sku',
        'variant_id',
        'intensity_id',
        'size_id',
        'name',
        'selling_price',
        'production_cost',
        'gross_profit',
        'gross_margin_percentage',
        'barcode',
        'image',
        'description',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'selling_price'           => 'integer',
        'production_cost'         => 'integer',
        'gross_profit'            => 'integer',
        'gross_margin_percentage' => 'decimal:2',
        'is_active'               => 'boolean',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function variant(): BelongsTo
    {
        return $this->belongsTo(Variant::class);
    }

    public function intensity(): BelongsTo
    {
        return $this->belongsTo(Intensity::class);
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }

    /**
     * Komposisi bahan baku hasil scaling dari variant recipe.
     * Packaging bersifat add-on di POS — tidak disimpan di sini.
     */
    public function recipes(): HasMany
    {
        return $this->hasMany(ProductRecipe::class);
    }

    // ── Business Logic ─────────────────────────────────────────────────────────

    /**
     * Hitung HPP dari ingredient cost saja.
     * Packaging tidak dihitung — bersifat add-on di POS.
     */
    public function calculateProductionCost(): void
    {
        $totalCost = (int) $this->recipes()->sum('total_cost');

        $this->production_cost         = $totalCost;
        $this->gross_profit            = $this->selling_price - $totalCost;
        $this->gross_margin_percentage = $this->selling_price > 0
            ? ($this->gross_profit / $this->selling_price) * 100
            : 0;

        $this->save();
    }

    /**
     * Recalculate costs berdasarkan current ingredient average_cost (WAC).
     * Packaging tidak di-recalculate — bersifat add-on di POS.
     */
    public function recalculateCosts(): void
    {
        foreach ($this->recipes as $recipe) {
            $recipe->unit_cost  = $recipe->ingredient->average_cost ?? 0;
            $recipe->total_cost = round($recipe->quantity * $recipe->unit_cost);
            $recipe->save();
        }

        $this->calculateProductionCost();
    }

    /**
     * Cek ketersediaan ingredient di store untuk sejumlah quantity produksi.
     */
    public function checkIngredientsAvailability(string $storeId, int $quantity = 1): array
    {
        $availability = [];
        $allAvailable = true;

        foreach ($this->recipes as $recipe) {
            $requiredQty = $recipe->quantity * $quantity;

            $stock = \App\Models\StoreIngredientStock::where('store_id', $storeId)
                ->where('ingredient_id', $recipe->ingredient_id)
                ->first();

            $availableQty = $stock ? $stock->quantity : 0;
            $isAvailable  = $availableQty >= $requiredQty;

            if (!$isAvailable) {
                $allAvailable = false;
            }

            $availability[] = [
                'ingredient_id'   => $recipe->ingredient_id,
                'ingredient_name' => $recipe->ingredient->name,
                'required'        => $requiredQty,
                'available'       => $availableQty,
                'is_available'    => $isAvailable,
                'shortage'        => max(0, $requiredQty - $availableQty),
            ];
        }

        return [
            'all_available' => $allAvailable,
            'items'         => $availability,
        ];
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByVariant($query, string $variantId)
    {
        return $query->where('variant_id', $variantId);
    }

    public function scopeByIntensity($query, string $intensityId)
    {
        return $query->where('intensity_id', $intensityId);
    }

    public function scopeBySize($query, string $sizeId)
    {
        return $query->where('size_id', $sizeId);
    }

    public function scopeFindByCombination($query, string $variantId, string $intensityId, string $sizeId)
    {
        return $query->where('variant_id', $variantId)
                     ->where('intensity_id', $intensityId)
                     ->where('size_id', $sizeId)
                     ->first();
    }

    // ── Accessors ──────────────────────────────────────────────────────────────

    public function getFormattedSellingPriceAttribute(): string
    {
        return 'Rp ' . number_format($this->selling_price, 0, ',', '.');
    }

    public function getFormattedProductionCostAttribute(): string
    {
        return 'Rp ' . number_format($this->production_cost, 0, ',', '.');
    }

    public function getFormattedGrossProfitAttribute(): string
    {
        return 'Rp ' . number_format($this->gross_profit, 0, ',', '.');
    }
}
