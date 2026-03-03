<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class StockMovementItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'stock_movement_id',
        'ingredient_id',
        'packaging_material_id', // NEW: for packaging items
        'item_type', // NEW: ingredient or packaging
        'quantity',
        'quantity_before',
        'quantity_after',
        'unit',
        'unit_cost',
        'total_cost',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'quantity_before' => 'decimal:2',
        'quantity_after' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];

    /**
     * Relationships
     */
    public function stockMovement()
    {
        return $this->belongsTo(StockMovement::class);
    }

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function packagingMaterial()
    {
        return $this->belongsTo(PackagingMaterial::class);
    }

    /**
     * Helper method to get the actual item (ingredient or packaging)
     */
    public function getItem()
    {
        if ($this->item_type === 'ingredient') {
            return $this->ingredient;
        } elseif ($this->item_type === 'packaging') {
            return $this->packagingMaterial;
        }

        return null;
    }

    /**
     * Helper method to get item name
     */
    public function getItemNameAttribute()
    {
        $item = $this->getItem();
        return $item ? $item->name : '-';
    }

    /**
     * Helper method to get item code
     */
    public function getItemCodeAttribute()
    {
        $item = $this->getItem();
        return $item ? $item->code : '-';
    }

    /**
     * Accessor for getting the correct item ID
     */
    public function getItemIdAttribute()
    {
        return $this->item_type === 'ingredient'
            ? $this->ingredient_id
            : $this->packaging_material_id;
    }
}
