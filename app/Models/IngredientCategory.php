<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class IngredientCategory extends Model
{
    use HasUuids;

    protected $fillable = ['code', 'name', 'description', 'is_active', 'sort_order'];
    protected $casts = ['is_active' => 'boolean'];

    public function ingredients()
    {
        return $this->hasMany(Ingredient::class);
    }
}
