<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountStore extends Model
{
    use HasUuids;

    protected $table = 'discount_stores';

    protected $fillable = [
        'discount_type_id',
        'store_id',
        // store_id nullable: null = berlaku di semua toko
    ];

    public function discountType(): BelongsTo
    {
        return $this->belongsTo(DiscountType::class, 'discount_type_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }
}
