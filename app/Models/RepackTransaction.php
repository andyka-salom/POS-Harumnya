<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class RepackTransaction extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'repack_number', 'location_type', 'location_id',
        'output_ingredient_id', 'output_quantity', 'output_cost',
        'repack_date', 'status', 'notes',
        'created_by', 'approved_by', 'approved_at',
    ];

    protected $casts = [
        // Schema: bigInteger SIGNED — qty selalu integer, bisa negatif (koreksi)
        'output_quantity' => 'integer',
        // Schema: decimal(15,4) — WAC cost per unit, simpan presisi fraksi
        'output_cost'     => 'decimal:4',
        'repack_date'     => 'date',
        'approved_at'     => 'datetime',
        'created_by'      => 'integer',
        'approved_by'     => 'integer',
    ];

    // ─── Relationships ──────────────────────────────────────────────────────────

    public function outputIngredient()
    {
        return $this->belongsTo(Ingredient::class, 'output_ingredient_id');
    }

    public function items()
    {
        return $this->hasMany(RepackTransactionItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ─── Accessors ───────────────────────────────────────────────────────────────

    /**
     * Total biaya input dalam rupiah.
     * total_cost di item adalah decimal(15,2) → sum sebagai float.
     */
    public function getTotalInputCostAttribute(): float
    {
        return (float) $this->items->sum('total_cost');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    public function canBeApproved(): bool
    {
        return in_array($this->status, ['draft', 'pending']);
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['draft', 'pending', 'approved']);
    }

    public static function generateNumber(): string
    {
        $prefix = 'RPK-' . now()->format('Ymd') . '-';
        $last   = static::where('repack_number', 'like', $prefix . '%')
                        ->orderByDesc('repack_number')
                        ->value('repack_number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
