<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiscountType extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'discount_types';

    protected $fillable = [
        'code', 'name', 'type', 'value',
        'buy_quantity', 'get_quantity', 'get_product_type',
        'min_purchase_amount', 'min_purchase_quantity', 'max_discount_amount',
        'start_date', 'end_date',
        'is_game_reward', 'game_probability',
        'priority', 'is_combinable', 'is_active',
        'description', 'terms_conditions',
    ];

    protected $casts = [
        // decimal(15,2) — nilai diskon: angka % atau rupiah
        'value'                 => 'decimal:2',
        // decimal(15,2) — minimal total belanja agar diskon berlaku (rupiah)
        'min_purchase_amount'   => 'decimal:2',
        // decimal(15,2) — batas maksimal potongan (rupiah)
        'max_discount_amount'   => 'decimal:2',
        // integer fields
        'buy_quantity'          => 'integer',
        'get_quantity'          => 'integer',
        'min_purchase_quantity' => 'integer',
        'game_probability'      => 'integer',
        'priority'              => 'integer',
        // boolean fields
        'is_game_reward'        => 'boolean',
        'is_combinable'         => 'boolean',
        'is_active'             => 'boolean',
        // date fields
        'start_date'            => 'date',
        'end_date'              => 'date',
        // json
        'terms_conditions'      => 'array',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function applicabilities(): HasMany
    {
        return $this->hasMany(DiscountApplicability::class, 'discount_type_id');
    }

    public function stores(): HasMany
    {
        return $this->hasMany(DiscountStore::class, 'discount_type_id');
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(DiscountRequirement::class, 'discount_type_id');
    }

    public function rewards(): HasMany
    {
        return $this->hasMany(DiscountReward::class, 'discount_type_id')
                    ->orderBy('priority', 'desc');
    }

    public function usages(): HasMany
    {
        return $this->hasMany(DiscountUsage::class, 'discount_type_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCurrentlyValid($query)
    {
        return $query->active()
            ->where(fn($q) => $q->whereNull('start_date')->orWhereDate('start_date', '<=', today()))
            ->where(fn($q) => $q->whereNull('end_date')->orWhereDate('end_date', '>=', today()));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    public function getTypeLabel(): string
    {
        return match ($this->type) {
            'percentage'   => 'Persentase (%)',
            'fixed_amount' => 'Nominal (Rp)',
            'buy_x_get_y'  => 'Buy X Get Y',
            'free_product' => 'Produk Gratis',
            'game_reward'  => 'Game Reward',
            'bundle'       => 'Bundle',
            default        => $this->type,
        };
    }

    public function isCurrentlyActive(): bool
    {
        if (! $this->is_active) return false;

        $today = today();

        if ($this->start_date && $this->start_date->gt($today)) return false;
        if ($this->end_date && $this->end_date->lt($today)) return false;

        return true;
    }
}
