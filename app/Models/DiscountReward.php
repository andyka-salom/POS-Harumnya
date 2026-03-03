<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscountReward extends Model
{
    use HasUuids;

    protected $table = 'discount_rewards';

    protected $fillable = [
        'discount_type_id',
        'variant_id',
        'intensity_id',
        'size_id',
        'reward_quantity',
        'customer_can_choose',
        'is_pool',
        'max_choices',
        'discount_percentage',
        'fixed_price',
        'priority',
    ];

    protected $casts = [
        // unsignedSmallInteger
        'reward_quantity'     => 'integer',
        'customer_can_choose' => 'boolean',
        'is_pool'             => 'boolean',
        // unsignedTinyInteger
        'max_choices'         => 'integer',
        // decimal(5,2) — 100.00 = gratis; 50.00 = diskon 50%
        'discount_percentage' => 'decimal:2',
        // decimal(15,2) — override harga reward (rupiah); null = tidak override
        // PERUBAHAN: sebelumnya unsignedBigInteger, sekarang decimal(15,2)
        'fixed_price'         => 'decimal:2',
        // unsignedTinyInteger
        'priority'            => 'integer',
    ];

    public function discountType(): BelongsTo
    {
        return $this->belongsTo(DiscountType::class, 'discount_type_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(Variant::class, 'variant_id');
    }

    public function intensity(): BelongsTo
    {
        return $this->belongsTo(Intensity::class, 'intensity_id');
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class, 'size_id');
    }

    public function pools(): HasMany
    {
        return $this->hasMany(DiscountRewardPool::class, 'discount_reward_id')
                    ->orderBy('sort_order');
    }
}
