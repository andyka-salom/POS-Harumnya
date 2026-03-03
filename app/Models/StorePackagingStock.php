<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class StorePackagingStock extends Model
{
    use HasUuids;

    protected $fillable = [
        'store_id',
        'packaging_material_id',
        'quantity',
        'min_stock',
        'max_stock',        // ✅ kolom ada di migration terbaru
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
        'quantity'     => 'integer',
        'min_stock'    => 'integer',
        'max_stock'    => 'integer',
        'last_in_qty'  => 'integer',
        'last_out_qty' => 'integer',
        'average_cost' => 'decimal:4',
        'total_value'  => 'decimal:2',
        'last_in_at'   => 'datetime',
        'last_out_at'  => 'datetime',
        'last_in_by'   => 'integer',
        'last_out_by'  => 'integer',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function packagingMaterial()
    {
        return $this->belongsTo(PackagingMaterial::class);
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

    public function scopeLowStock($query)
    {
        return $query->whereNotNull('min_stock')
                     ->where('min_stock', '>', 0)
                     ->where('quantity', '>', 0)
                     ->whereColumn('quantity', '<', 'min_stock');
    }

    public function scopeOutOfStock($query)
    {
        return $query->where('quantity', '<=', 0);
    }

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
