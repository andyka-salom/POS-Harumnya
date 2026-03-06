<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalePayment extends Model
{
    use HasUuids;

    protected $fillable = [
        'sale_id',
        'payment_method_id',
        'payment_method_name',   // ← tambahkan ini
        'payment_method_type',   // ← tambahkan ini
        'amount',
        'admin_fee',             // ← tambahkan ini
        'payment_status',        // ← tambahkan ini
        'reference_number',
        'settled_at',            // ← tambahkan ini
        'notes',
    ];

    protected $casts = [
        'amount'    => 'decimal:2',
        'admin_fee' => 'decimal:2',
        'settled_at'=> 'datetime',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }
}
