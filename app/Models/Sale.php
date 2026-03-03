<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use HasUuids, SoftDeletes;

    protected $table    = 'sales';
    protected $fillable = [
        'sale_number',
        'store_id',
        'cashier_id',        'cashier_name',
        'sales_person_id',   'sales_person_name',
        'customer_id',       'customer_name',
        'sold_at',
        'subtotal_perfume',  'subtotal_packaging',  'subtotal',
        'discount_amount',   'tax_amount',           'total',
        'amount_paid',       'change_amount',
        'cogs_perfume',      'cogs_packaging',       'cogs_total',
        'gross_profit',      'gross_margin_pct',
        'points_earned',     'points_redeemed',      'points_redemption_value',
        'status', 'notes',
        'cancellation_reason', 'cancelled_at', 'cancelled_by',
    ];

    protected $casts = [
        'sold_at'          => 'datetime',
        'cancelled_at'     => 'datetime',
        'gross_margin_pct' => 'decimal:2',
    ];

    public function store(): BelongsTo        { return $this->belongsTo(Store::class,       'store_id'); }
    public function cashier(): BelongsTo      { return $this->belongsTo(User::class,        'cashier_id'); }
    public function customer(): BelongsTo     { return $this->belongsTo(Customer::class,    'customer_id'); }
    public function salesPerson(): BelongsTo  { return $this->belongsTo(SalesPerson::class, 'sales_person_id'); }
    public function items(): HasMany          { return $this->hasMany(SaleItem::class,       'sale_id'); }
    public function discounts(): HasMany      { return $this->hasMany(SaleDiscount::class,   'sale_id'); }
    public function payments(): HasMany       { return $this->hasMany(SalePayment::class,    'sale_id'); }

    public function scopeCompleted($q) { return $q->where('status', 'completed'); }
    public function scopeToday($q)     { return $q->whereDate('sold_at', today()); }
}
