<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class StockTransferItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'stock_transfer_id', 'item_type', 'item_id',
        'quantity_requested', 'quantity_sent', 'quantity_received',
        'unit_cost', 'notes',
    ];

    protected $casts = [
        // Schema: bigInteger SIGNED — qty selalu positif dalam konteks normal, tapi kolom signed
        'quantity_requested' => 'integer',
        'quantity_sent'      => 'integer',
        'quantity_received'  => 'integer',
        // Schema: decimal(15,4) — snapshot WAC dari lokasi sumber
        'unit_cost'          => 'decimal:4',
    ];

    public function stockTransfer()
    {
        return $this->belongsTo(StockTransfer::class);
    }

    public function getItemNameAttribute(): string
    {
        if ($this->item_type === 'ingredient') {
            return \App\Models\Ingredient::find($this->item_id)?->name ?? '-';
        }
        return \App\Models\PackagingMaterial::find($this->item_id)?->name ?? '-';
    }
}
