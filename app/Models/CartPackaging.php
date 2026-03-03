<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * CartPackaging — packaging add-on yang melekat pada satu cart item.
 * Unique: (cart_id, packaging_material_id) — sesuai uq_cart_packaging.
 */
class CartPackaging extends Model
{
    use HasUuids;

    protected $table    = 'cart_packagings';
    protected $fillable = [
        'cart_id',
        'packaging_material_id',
        'qty',
        'unit_price',
    ];

    protected $casts = [
        'qty'        => 'integer',
        'unit_price' => 'integer',
    ];

    // ── Relations ──────────────────────────────────────────────────────────────

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class, 'cart_id');
    }

    public function packagingMaterial(): BelongsTo
    {
        return $this->belongsTo(PackagingMaterial::class, 'packaging_material_id');
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    public function getSubtotalAttribute(): int
    {
        return ($this->unit_price ?? 0) * ($this->qty ?? 1);
    }
}
