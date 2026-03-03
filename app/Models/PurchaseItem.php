<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PurchaseItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'purchase_id', 'item_type', 'item_id',
        'quantity', 'unit_price', 'subtotal', 'notes',
    ];

    protected $casts = [
        // ★ bigInteger SIGNED (retur bisa negatif)
        'quantity'   => 'integer',
        // ★ decimal(15,2) sesuai migration 006
        'unit_price' => 'decimal:2',
        'subtotal'   => 'decimal:2',
    ];

    public function purchase() { return $this->belongsTo(Purchase::class); }

    // ─── Lazy-resolved item attributes (dipakai di Show page) ────────────────
    // Catatan: accessor ini melakukan query per-item.
    // Untuk performa tinggi, gunakan eager-load di controller.

    public function getItemNameAttribute(): string
    {
        return match ($this->item_type) {
            'ingredient'         => Ingredient::find($this->item_id)?->name ?? '-',
            'packaging_material' => PackagingMaterial::find($this->item_id)?->name ?? '-',
            default              => '-',
        };
    }

    public function getItemCodeAttribute(): string
    {
        return match ($this->item_type) {
            'ingredient'         => Ingredient::find($this->item_id)?->code ?? '-',
            'packaging_material' => PackagingMaterial::find($this->item_id)?->code ?? '-',
            default              => '-',
        };
    }

    public function getItemUnitAttribute(): string
    {
        return match ($this->item_type) {
            'ingredient'         => Ingredient::find($this->item_id)?->unit ?? 'unit',
            'packaging_material' => PackagingMaterial::with('size')->find($this->item_id)?->size?->name ?? 'pcs',
            default              => 'unit',
        };
    }
}
