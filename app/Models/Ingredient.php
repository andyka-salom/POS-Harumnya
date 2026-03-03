<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Ingredient extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'ingredient_category_id',
        'code',
        'name',
        'unit',
        'description',
        'image',
        'average_cost',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active'    => 'boolean',
        'average_cost' => 'decimal:4',
        'sort_order'   => 'integer',
    ];

    protected $appends = ['image_url'];

    // ─── Accessors ───────────────────────────────────────────────────────

    public function getImageUrlAttribute(): ?string
    {
        return $this->image ? Storage::url($this->image) : null;
    }

    /**
     * Shortcut ke ingredient_type dari kategori.
     * Pastikan relasi category sudah di-eager load sebelum mengakses ini.
     *
     * Contoh: Ingredient::with('category')->get()
     *         lalu $ingredient->ingredient_type → 'oil' | 'alcohol' | 'other'
     *
     * @return 'oil'|'alcohol'|'other'|null
     */
    public function getIngredientTypeAttribute(): ?string
    {
        return $this->category?->ingredient_type;
    }

    // ─── Relations ───────────────────────────────────────────────────────

    public function category(): BelongsTo
    {
        return $this->belongsTo(IngredientCategory::class, 'ingredient_category_id');
    }

    public function warehouseStocks(): HasMany
    {
        return $this->hasMany(WarehouseIngredientStock::class, 'ingredient_id');
    }

    public function storeStocks(): HasMany
    {
        return $this->hasMany(StoreIngredientStock::class, 'ingredient_id');
    }

    public function variantRecipes(): HasMany
    {
        return $this->hasMany(VariantRecipe::class, 'ingredient_id');
    }

    public function productRecipes(): HasMany
    {
        return $this->hasMany(ProductRecipe::class, 'ingredient_id');
    }

    // ─── Scopes ──────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeSearch($query, string $search)
    {
        return $query->where(fn($q) =>
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('code', 'like', "%{$search}%")
        );
    }

    /**
     * Filter ingredient berdasarkan ingredient_type dari kategorinya.
     *
     * Contoh:
     *   Ingredient::byType('oil')->get()
     *   Ingredient::byType('alcohol')->active()->get()
     */
    public function scopeByType($query, string $type)
    {
        return $query->whereHas('category', fn($q) =>
            $q->where('ingredient_type', $type)
        );
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    public function isOil(): bool
    {
        return $this->ingredient_type === 'oil';
    }

    public function isAlcohol(): bool
    {
        return $this->ingredient_type === 'alcohol';
    }

    public function isOther(): bool
    {
        return $this->ingredient_type === 'other';
    }

    // ─── WAC Update ──────────────────────────────────────────────────────

    /**
     * Update average_cost menggunakan Weighted Average Cost (WAC).
     * Dipanggil dari PurchaseController::receive() setelah stok masuk.
     *
     * Formula:
     *   new_avg = (old_qty × old_cost + received_qty × purchase_price)
     *             / (old_qty + received_qty)
     *
     * @param int   $qtyReceived   Jumlah unit yang diterima dari PO
     * @param int   $purchasePrice Harga beli per unit di PO ini (rupiah)
     * @param float $currentStock  Total stok semua lokasi SEBELUM penambahan ini
     */
    public function updateAverageCost(int $qtyReceived, int $purchasePrice, float $currentStock): void
    {
        if ($qtyReceived <= 0) return;

        $oldCost = (float) $this->average_cost;
        $oldQty  = max(0, $currentStock);
        $newTotal = $oldQty + $qtyReceived;

        if ($newTotal <= 0) return;

        $newAvgCost = (($oldQty * $oldCost) + ($qtyReceived * $purchasePrice)) / $newTotal;

        $this->update(['average_cost' => round($newAvgCost, 4)]);
    }
}
