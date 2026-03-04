<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'code',
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'payment_term',
        'credit_limit',
        'is_active',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:2',
        'is_active'    => 'boolean',
        'deleted_at'   => 'datetime',
    ];

    // ─── Payment Term Labels ───────────────────────────────────────────────

    public const PAYMENT_TERMS = [
        'cash'      => 'Tunai (Cash)',
        'credit_7'  => 'Kredit 7 Hari',
        'credit_14' => 'Kredit 14 Hari',
        'credit_30' => 'Kredit 30 Hari',
        'credit_60' => 'Kredit 60 Hari',
    ];

    public function getPaymentTermLabelAttribute(): string
    {
        return self::PAYMENT_TERMS[$this->payment_term] ?? $this->payment_term;
    }

    public function getFormattedCreditLimitAttribute(): string
    {
        return 'Rp ' . number_format($this->credit_limit, 2, ',', '.');
    }

    public function getStatusLabelAttribute(): string
    {
        return $this->is_active ? 'Aktif' : 'Nonaktif';
    }

    // ─── Scopes ───────────────────────────────────────────────────────────

    public function scopeSearch($query, string $keyword)
    {
        return $query->where(function ($q) use ($keyword) {
            $q->where('name', 'like', "%{$keyword}%")
              ->orWhere('code', 'like', "%{$keyword}%")
              ->orWhere('email', 'like', "%{$keyword}%")
              ->orWhere('contact_person', 'like', "%{$keyword}%")
              ->orWhere('phone', 'like', "%{$keyword}%");
        });
    }

    public function scopeByPaymentTerm($query, string $term)
    {
        return $query->where('payment_term', $term);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
