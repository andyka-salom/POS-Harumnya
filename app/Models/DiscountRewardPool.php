<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountRewardPool extends Model
{
    use HasUuids;

    protected $table = 'discount_reward_pools';

    protected $fillable = [
        'discount_reward_id',
        'product_id',
        'variant_id',
        'intensity_id',
        'size_id',
        'label',
        'image_url',
        'fixed_price',
        'probability',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        // decimal(15,2) — 0.00 = gratis; null = ikut discount_rewards.fixed_price
        'fixed_price'  => 'decimal:2',
        // unsignedTinyInteger — bobot Plinko 1–100; null = equal weight
        'probability'  => 'integer',
        'is_active'    => 'boolean',
        // unsignedSmallInteger
        'sort_order'   => 'integer',
    ];

    public function reward(): BelongsTo
    {
        return $this->belongsTo(DiscountReward::class, 'discount_reward_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
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
}
