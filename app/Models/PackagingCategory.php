<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PackagingCategory extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'description',
        'is_active',
        'sort_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer'
    ];

    public function materials()
    {
        return $this->hasMany(PackagingMaterial::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
