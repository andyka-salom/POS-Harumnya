<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class Purchase extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'purchase_number', 'supplier_id', 'destination_type', 'destination_id',
        'purchase_date', 'expected_delivery_date', 'actual_delivery_date', 'status',
        'subtotal', 'tax', 'discount', 'shipping_cost', 'total',
        'notes', 'cancellation_reason',
        'created_by', 'approved_by', 'approved_at', 'received_by', 'received_at',
    ];

    protected $casts = [
        'purchase_date'          => 'date',
        'expected_delivery_date' => 'date',
        'actual_delivery_date'   => 'date',
        'approved_at'            => 'datetime',
        'received_at'            => 'datetime',
        // ★ Migration 006: decimal(15,2) — gunakan string agar tidak kehilangan presisi float
        'subtotal'               => 'decimal:2',
        'tax'                    => 'decimal:2',
        'discount'               => 'decimal:2',
        'shipping_cost'          => 'decimal:2',
        'total'                  => 'decimal:2',
        // FK users (unsignedBigInteger)
        'created_by'             => 'integer',
        'approved_by'            => 'integer',
        'received_by'            => 'integer',
    ];

    protected $appends = [
        'can_edit', 'can_submit', 'can_approve',
        'can_receive', 'can_complete', 'can_cancel',
        'status_label',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────
    public function items()    { return $this->hasMany(PurchaseItem::class); }
    public function supplier() { return $this->belongsTo(Supplier::class); }
    public function creator()  { return $this->belongsTo(User::class, 'created_by'); }
    public function approver() { return $this->belongsTo(User::class, 'approved_by'); }
    public function receiver() { return $this->belongsTo(User::class, 'received_by'); }

    // ─── Workflow guards ──────────────────────────────────────────────────────
    public function canEdit():     bool { return in_array($this->status, ['draft', 'pending']); }
    public function canSubmit():   bool { return $this->status === 'draft'; }
    public function canApprove():  bool { return $this->status === 'pending'; }
    public function canReceive():  bool { return $this->status === 'approved'; }
    public function canComplete(): bool { return $this->status === 'received'; }
    public function canCancel():   bool { return in_array($this->status, ['draft', 'pending', 'approved']); }

    // ─── Appended accessors ───────────────────────────────────────────────────
    public function getCanEditAttribute():     bool { return $this->canEdit(); }
    public function getCanSubmitAttribute():   bool { return $this->canSubmit(); }
    public function getCanApproveAttribute():  bool { return $this->canApprove(); }
    public function getCanReceiveAttribute():  bool { return $this->canReceive(); }
    public function getCanCompleteAttribute(): bool { return $this->canComplete(); }
    public function getCanCancelAttribute():   bool { return $this->canCancel(); }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft'     => 'Draft',
            'pending'   => 'Menunggu Approval',
            'approved'  => 'Disetujui',
            'received'  => 'Diterima',
            'completed' => 'Selesai',
            'cancelled' => 'Dibatalkan',
            default     => ucfirst($this->status),
        };
    }

    // ─── Auto PO number ───────────────────────────────────────────────────────
    public static function generateNumber(): string
    {
        $prefix = 'PO-' . now()->format('Ymd') . '-';
        $last   = static::withTrashed()
                        ->where('purchase_number', 'like', $prefix . '%')
                        ->orderByDesc('purchase_number')
                        ->value('purchase_number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
