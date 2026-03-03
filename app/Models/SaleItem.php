<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleItem extends Model
{
    use HasUuids;

    protected $table    = 'sale_items';
    protected $fillable = [
        'sale_id', 'product_id',
        'product_name', 'product_sku',
        'variant_name', 'intensity_code', 'size_ml',
        'qty', 'unit_price', 'item_discount', 'subtotal',
        'cogs_per_unit', 'cogs_total',
        'line_gross_profit', 'line_gross_margin_pct',
        'notes',
    ];

    protected $casts = [
        'qty'                   => 'integer',
        'unit_price'            => 'integer',
        'item_discount'         => 'integer',
        'subtotal'              => 'integer',
        'cogs_per_unit'         => 'integer',
        'cogs_total'            => 'integer',
        'line_gross_profit'     => 'integer',
        'line_gross_margin_pct' => 'decimal:2',
        'size_ml'               => 'integer',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function packagings(): HasMany
    {
        return $this->hasMany(SaleItemPackaging::class, 'sale_item_id');
    }
}
