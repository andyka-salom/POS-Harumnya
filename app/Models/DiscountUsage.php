<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountUsage extends Model
{
    use HasUuids;

    protected $table = 'discount_usages';

    protected $fillable = [
        'discount_type_id',
        'order_id',
        'store_id',
        // BUG FIX: customer_id FK ke customers (BUKAN users!)
        // FK constraint ditambahkan di migration 010 setelah tabel customers dibuat
        'customer_id',
        'discount_amount',
        'original_amount',
        'final_amount',
        'applied_to_items',
        'reward_items',
        'is_game_reward',
        'game_type',
        'game_result',
        'chosen_reward_pool_id',
        'used_at',
    ];

    protected $casts = [
        // decimal(15,2) — nominal diskon yang diberikan (rupiah)
        'discount_amount' => 'decimal:2',
        // decimal(15,2) — total belanja sebelum diskon (rupiah)
        'original_amount' => 'decimal:2',
        // decimal(15,2) — total belanja setelah diskon (rupiah)
        'final_amount'    => 'decimal:2',
        // json snapshots
        'applied_to_items' => 'array',
        'reward_items'     => 'array',
        'is_game_reward'   => 'boolean',
        'used_at'          => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function discountType(): BelongsTo
    {
        return $this->belongsTo(DiscountType::class, 'discount_type_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * FK ke tabel customers (BUKAN users!).
     * Constraint ditambahkan di migration 010 setelah tabel customers dibuat.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    /**
     * FK ke tabel sales (order).
     * Constraint ditambahkan di migration 010 setelah tabel sales dibuat.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'order_id');
    }

    public function chosenRewardPool(): BelongsTo
    {
        return $this->belongsTo(DiscountRewardPool::class, 'chosen_reward_pool_id');
    }
}
