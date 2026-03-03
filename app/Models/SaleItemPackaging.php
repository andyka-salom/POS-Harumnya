<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItemPackaging extends Model
{
    use HasUuids;

    protected $table    = 'sale_item_packagings';
    protected $fillable = [
        'sale_item_id', 'packaging_material_id',
        'packaging_name', 'packaging_code',
        'qty', 'unit_price', 'subtotal',
        'unit_cost', 'cogs_total',
        'line_gross_profit', 'line_gross_margin_pct',
    ];

    protected $casts = [
        'qty'                   => 'integer',
        'unit_price'            => 'integer',
        'subtotal'              => 'integer',
        'unit_cost'             => 'integer',
        'cogs_total'            => 'integer',
        'line_gross_profit'     => 'integer',
        'line_gross_margin_pct' => 'decimal:2',
    ];

    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class, 'sale_item_id');
    }

    public function packagingMaterial(): BelongsTo
    {
        return $this->belongsTo(PackagingMaterial::class, 'packaging_material_id');
    }
}
