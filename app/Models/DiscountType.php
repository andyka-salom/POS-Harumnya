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
        // FIX: tambah start_time & end_time sesuai migration
        'start_time', 'end_time',
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
        // time fields — disimpan sebagai string HH:MM:SS, tidak perlu cast khusus
        // 'start_time' dan 'end_time' akan dikembalikan sebagai string
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
        $now   = now();
        $today = $now->toDateString();
        $time  = $now->format('H:i:s');

        return $query
            ->active()
            // Tanggal berlaku
            ->where(fn ($q) => $q->whereNull('start_date')->orWhereDate('start_date', '<=', $today))
            ->where(fn ($q) => $q->whereNull('end_date')->orWhereDate('end_date', '>=', $today))
            // Happy hour: jika start_time/end_time diset, cek range jam
            ->where(fn ($q) => $q
                ->whereNull('start_time')
                ->orWhere(fn ($inner) => $inner
                    ->whereTime('start_time', '<=', $time)
                    ->whereTime('end_time', '>=', $time)
                )
            );
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

        $now   = now();
        $today = $now->toDateString();

        if ($this->start_date && $this->start_date->toDateString() > $today) return false;
        if ($this->end_date && $this->end_date->toDateString() < $today) return false;

        // Cek happy hour jika dikonfigurasi
        if ($this->start_time && $this->end_time) {
            $currentTime = $now->format('H:i:s');
            // Normalisasi ke HH:MM:SS
            $start = strlen($this->start_time) === 5 ? $this->start_time . ':00' : $this->start_time;
            $end   = strlen($this->end_time) === 5 ? $this->end_time . ':00' : $this->end_time;

            if ($currentTime < $start || $currentTime > $end) return false;
        }

        return true;
    }

    /**
     * Format start_time & end_time ke HH:MM untuk ditampilkan di frontend.
     * Menghapus detik jika ada (:SS).
     */
    public function getStartTimeFormattedAttribute(): ?string
    {
        if (! $this->start_time) return null;
        return substr($this->start_time, 0, 5);
    }

    public function getEndTimeFormattedAttribute(): ?string
    {
        if (! $this->end_time) return null;
        return substr($this->end_time, 0, 5);
    }
}
