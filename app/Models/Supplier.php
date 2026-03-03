<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;

class Supplier extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'code',
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'tax_id',
        'payment_term',
        'credit_limit',
        'is_active'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'is_active' => 'boolean',
        'credit_limit' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * The attributes that should be hidden for arrays.
     */
    protected $hidden = [
        'deleted_at',
    ];

    /**
     * The accessors to append to the model's array form.
     */
    protected $appends = [
        'status_label',
        'payment_term_label',
    ];

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'id';
    }

    /**
     * Boot the model.
     */
    protected static function boot(): void
    {
        parent::boot();

        // Ensure code is always uppercase
        static::creating(function ($supplier) {
            $supplier->code = strtoupper($supplier->code);
        });

        static::updating(function ($supplier) {
            $supplier->code = strtoupper($supplier->code);
        });
    }

    /**
     * Scope untuk pencarian data supplier
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (empty($term)) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($term) {
            $searchTerm = "%{$term}%";
            $q->where('name', 'like', $searchTerm)
              ->orWhere('code', 'like', $searchTerm)
              ->orWhere('contact_person', 'like', $searchTerm)
              ->orWhere('email', 'like', $searchTerm)
              ->orWhere('phone', 'like', $searchTerm);
        });
    }

    /**
     * Scope untuk filter supplier aktif
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope untuk filter supplier tidak aktif
     */
    public function scopeInactive(Builder $query): Builder
    {
        return $query->where('is_active', false);
    }

    /**
     * Scope untuk filter berdasarkan payment term
     */
    public function scopeByPaymentTerm(Builder $query, string $term): Builder
    {
        return $query->where('payment_term', $term);
    }

    /**
     * Get status label attribute
     */
    public function getStatusLabelAttribute(): string
    {
        return $this->is_active ? 'Aktif' : 'Nonaktif';
    }

    /**
     * Get payment term label attribute
     */
    public function getPaymentTermLabelAttribute(): string
    {
        return match($this->payment_term) {
            'cash' => 'Tunai (Cash)',
            'credit_7' => 'Kredit 7 Hari',
            'credit_14' => 'Kredit 14 Hari',
            'credit_30' => 'Kredit 30 Hari',
            'credit_60' => 'Kredit 60 Hari',
            default => ucfirst(str_replace('_', ' ', $this->payment_term)),
        };
    }

    /**
     * Check if supplier has credit payment
     */
    public function hasCreditPayment(): bool
    {
        return $this->payment_term !== 'cash';
    }

    /**
     * Get credit days
     */
    public function getCreditDays(): int
    {
        return match($this->payment_term) {
            'credit_7' => 7,
            'credit_14' => 14,
            'credit_30' => 30,
            'credit_60' => 60,
            default => 0,
        };
    }

    /**
     * Format credit limit to readable format
     */
    public function getFormattedCreditLimitAttribute(): string
    {
        return 'Rp ' . number_format($this->credit_limit, 0, ',', '.');
    }
}
