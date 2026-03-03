<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Cart — keranjang belanja aktif (atau di-hold) kasir.
 *
 * Aturan 1 kasir per toko:
 *   - hold_id IS NULL  = cart aktif (hanya 1 per kasir per toko, enforced di app)
 *   - hold_id NOT NULL = cart di-hold/parkir (boleh banyak)
 */
class Cart extends Model
{
    use HasUuids;

    protected $table    = 'carts';
    protected $fillable = [
        'cashier_id',
        'store_id',
        'variant_id',
        'intensity_id',
        'size_id',
        'product_id',
        'unit_price',
        'qty',
        'customer_id',
        'sales_person_id',
        'hold_id',
        'hold_label',
        'held_at',
        'cart_expires_at',
        'notes',
    ];

    protected $casts = [
        'unit_price'      => 'integer',
        'qty'             => 'integer',
        'held_at'         => 'datetime',
        'cart_expires_at' => 'datetime',
    ];

    // ── Relations ──────────────────────────────────────────────────────────────

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
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

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function salesPerson(): BelongsTo
    {
        return $this->belongsTo(SalesPerson::class, 'sales_person_id');
    }

    /** Packaging add-ons untuk item ini (bisa lebih dari 1). */
    public function packagings(): HasMany
    {
        return $this->hasMany(CartPackaging::class, 'cart_id');
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

    /** Cart aktif (tidak di-hold). */
    public function scopeActive($query)
    {
        return $query->whereNull('hold_id');
    }

    /** Cart yang di-hold. */
    public function scopeHeld($query)
    {
        return $query->whereNotNull('hold_id');
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    /** Harga total item ini (parfum + semua packaging × qty). */
    public function getTotalAttribute(): int
    {
        $pkgTotal = $this->packagings->sum(fn ($p) => ($p->unit_price ?? 0) * ($p->qty ?? 1));
        return ($this->unit_price * $this->qty) + $pkgTotal;
    }
}
