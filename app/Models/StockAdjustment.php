<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockAdjustment extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'adjustment_number', 'location_type', 'location_id',
        'adjustment_date', 'type', 'status',
        'notes', 'cancellation_reason',
        'created_by', 'approved_by', 'approved_at',
    ];

    protected $casts = [
        'adjustment_date' => 'date',
        'approved_at'     => 'datetime',
        'created_by'      => 'integer',
        'approved_by'     => 'integer',
    ];

    protected $appends = ['can_edit', 'can_approve', 'can_complete', 'can_cancel', 'type_label'];

    public function getCanEditAttribute():    bool { return $this->canEdit(); }
    public function getCanApproveAttribute(): bool { return $this->canApprove(); }
    public function getCanCompleteAttribute(): bool { return $this->canComplete(); }
    public function getCanCancelAttribute():  bool { return $this->canCancel(); }

    // ─── Relationships ──────────────────────────────────────────────────────────

    public function items()    { return $this->hasMany(StockAdjustmentItem::class); }
    public function creator()  { return $this->belongsTo(User::class, 'created_by'); }
    public function approver() { return $this->belongsTo(User::class, 'approved_by'); }

    // ─── Accessors ───────────────────────────────────────────────────────────────

    public static function generateNumber(): string
    {
        $prefix = 'ADJ-' . now()->format('Ymd') . '-';
        $last   = static::where('adjustment_number', 'like', $prefix . '%')
                        ->orderByDesc('adjustment_number')->value('adjustment_number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'stock_opname' => 'Stock Opname',
            'damage'       => 'Barang Rusak',
            'loss'         => 'Barang Hilang',
            'found'        => 'Barang Ditemukan',
            'expired'      => 'Kadaluarsa',
            'other'        => 'Lainnya',
            default        => ucfirst($this->type),
        };
    }

    /**
     * Total nilai surplus — value_difference adalah decimal(15,2) → float.
     * Gunakan (float) bukan (int) karena kolom bukan integer lagi.
     */
    public function getTotalSurplusAttribute(): float
    {
        return round((float) $this->items->where('difference', '>', 0)->sum('value_difference'), 2);
    }

    /**
     * Total nilai kekurangan — absolute value dari sum item negatif.
     */
    public function getTotalShortageAttribute(): float
    {
        return round((float) abs($this->items->where('difference', '<', 0)->sum('value_difference')), 2);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    public function canEdit():    bool { return in_array($this->status, ['draft', 'pending']); }
    public function canApprove(): bool { return $this->status === 'pending'; }
    public function canComplete(): bool { return $this->status === 'approved'; }
    public function canCancel():  bool { return in_array($this->status, ['draft', 'pending', 'approved']); }
}
