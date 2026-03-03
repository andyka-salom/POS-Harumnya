<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesPerson extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'store_id',
        'code',
        'name',
        'phone',
        'email',
        'join_date',
        'is_active',
    ];

    protected $casts = [
        'join_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function targets(): HasMany
    {
        return $this->hasMany(SalesTarget::class, 'sales_person_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
