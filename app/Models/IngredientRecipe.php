<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IngredientRecipe extends Model
{
    use HasUuids;

    protected $fillable = ['compound_ingredient_id', 'base_ingredient_id', 'quantity', 'unit', 'sort_order'];

    public function compound(): BelongsTo { return $this->belongsTo(Ingredient::class, 'compound_ingredient_id'); }
    public function base(): BelongsTo { return $this->belongsTo(Ingredient::class, 'base_ingredient_id'); }
}
