<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CustomerPointLedger extends Model
{
    use HasUuids;

    protected $table = 'customer_point_ledgers';

    protected $fillable = [
        'customer_id',
        'type',
        'points',
        'balance_after',
        'reference_type',
        'reference_id',
        'notes',
        'expired_at',
        'created_by',
    ];

    protected $casts = [
        'points'       => 'integer',
        'balance_after' => 'integer',
        'expired_at'   => 'datetime',
    ];

    public const TYPES = ['earned', 'redeemed', 'expired', 'adjusted'];

    // ─── Relations ────────────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function reference(): MorphTo
    {
        return $this->morphTo('reference');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    // ─── Scopes ───────────────────────────────────────────────────────

    public function scopeEarned($query)
    {
        return $query->where('type', 'earned');
    }

    public function scopeRedeemed($query)
    {
        return $query->where('type', 'redeemed');
    }

    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expired_at')->orWhere('expired_at', '>', now());
        });
    }
}
