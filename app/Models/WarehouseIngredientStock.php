<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WarehouseIngredientStock extends Model
{
    use HasUuids;

    protected $fillable = [
        'warehouse_id',
        'ingredient_id',
        'quantity',
        'min_stock',
        'max_stock',        // ✅ kolom ada di migration — wajib di fillable
        'average_cost',
        'total_value',
        'last_in_at',
        'last_in_by',
        'last_in_qty',
        'last_out_at',
        'last_out_by',
        'last_out_qty',
    ];

    protected $casts = [
        // migration: bigInteger — jangan cast ke decimal agar tidak ada presisi palsu
        'quantity'     => 'integer',
        'min_stock'    => 'integer',
        'max_stock'    => 'integer',
        'last_in_qty'  => 'integer',
        'last_out_qty' => 'integer',
        // migration: decimal(15,4) / decimal(15,2)
        'average_cost' => 'decimal:4',
        'total_value'  => 'decimal:2',
        'last_in_at'   => 'datetime',
        'last_out_at'  => 'datetime',
        // users.id adalah bigInteger (bukan uuid)
        'last_in_by'   => 'integer',
        'last_out_by'  => 'integer',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function lastInUser()
    {
        return $this->belongsTo(User::class, 'last_in_by');
    }

    public function lastOutUser()
    {
        return $this->belongsTo(User::class, 'last_out_by');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    /**
     * Stok rendah: di bawah minimum tapi masih > 0.
     * Stok negatif dikategorikan outOfStock, bukan low stock.
     */
    public function scopeLowStock($query)
    {
        return $query->whereNotNull('min_stock')
                     ->where('min_stock', '>', 0)
                     ->where('quantity', '>', 0)
                     ->whereColumn('quantity', '<', 'min_stock');
    }

    /**
     * Stok habis: qty <= 0 (termasuk negatif — pengambilan darurat).
     */
    public function scopeOutOfStock($query)
    {
        return $query->where('quantity', '<=', 0);
    }

    /**
     * Overstock: qty > max_stock.
     * Ingredient punya kolom max_stock di migration.
     */
    public function scopeOverStock($query)
    {
        return $query->whereNotNull('max_stock')
                     ->where('max_stock', '>', 0)
                     ->whereColumn('quantity', '>', 'max_stock');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function recalculateTotalValue(): void
    {
        $this->total_value = $this->quantity * $this->average_cost;
        $this->save();
    }

    /**
     * Kembalikan status stok sebagai string enum.
     * Konsisten dengan logika di frontend.
     */
    public function getStockStatusAttribute(): string
    {
        if ($this->quantity <= 0) {
            return 'out_of_stock';
        }

        if ($this->min_stock !== null && $this->min_stock > 0 && $this->quantity < $this->min_stock) {
            return 'low_stock';
        }

        if ($this->max_stock !== null && $this->max_stock > 0 && $this->quantity > $this->max_stock) {
            return 'over_stock';
        }

        return 'normal';
    }
}
