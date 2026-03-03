<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentMethod extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'name',
        'type',
        'has_admin_fee',
        'admin_fee_pct',
        'can_give_change',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'has_admin_fee'   => 'boolean',
            'admin_fee_pct'   => 'decimal:2',
            'can_give_change' => 'boolean',
            'is_active'       => 'boolean',
            'sort_order'      => 'integer',
        ];
    }

    public const TYPES = [
        'cash'     => 'Tunai',
        'card'     => 'Kartu Debit/Kredit',
        'transfer' => 'Transfer Bank',
        'qris'     => 'QRIS',
        'ewallet'  => 'E-Wallet',
        'other'    => 'Lainnya',
    ];

    public const TYPE_COLORS = [
        'cash'     => 'green',
        'card'     => 'blue',
        'transfer' => 'indigo',
        'qris'     => 'purple',
        'ewallet'  => 'pink',
        'other'    => 'slate',
    ];

    // ─── Scopes ───────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }

    // ─── Accessors ────────────────────────────────────────────────────

    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    /**
     * Hitung biaya admin berdasarkan nominal transaksi.
     */
    public function calculateAdminFee(int|float $amount): float
    {
        if (! $this->has_admin_fee || $this->admin_fee_pct <= 0) {
            return 0;
        }

        return round($amount * ($this->admin_fee_pct / 100), 0);
    }

    // ─── Relations ────────────────────────────────────────────────────

    public function salePayments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    public function isCash(): bool
    {
        return $this->type === 'cash';
    }
}
