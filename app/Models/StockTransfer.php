<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockTransfer extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'transfer_number', 'from_location_type', 'from_location_id',
        'to_location_type', 'to_location_id', 'transfer_date',
        'expected_arrival_date', 'actual_arrival_date', 'status',
        'notes', 'cancellation_reason',
        'created_by', 'approved_by', 'approved_at',
        'sent_by', 'sent_at', 'received_by', 'received_at',
    ];

    protected $casts = [
        'transfer_date'         => 'date',
        'expected_arrival_date' => 'date',
        'actual_arrival_date'   => 'date',
        'approved_at'           => 'datetime',
        'sent_at'               => 'datetime',
        'received_at'           => 'datetime',
        'created_by'            => 'integer',
        'approved_by'           => 'integer',
        'sent_by'               => 'integer',
        'received_by'           => 'integer',
    ];

    // ─── Relationships ──────────────────────────────────────────────────────────

    public function items()          { return $this->hasMany(StockTransferItem::class); }
    public function creator()        { return $this->belongsTo(User::class, 'created_by'); }
    public function approver()       { return $this->belongsTo(User::class, 'approved_by'); }
    public function sender()         { return $this->belongsTo(User::class, 'sent_by'); }
    public function receiver()       { return $this->belongsTo(User::class, 'received_by'); }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    public static function generateNumber(): string
    {
        $prefix = 'TRF-' . now()->format('Ymd') . '-';
        $last   = static::where('transfer_number', 'like', $prefix . '%')
                        ->orderByDesc('transfer_number')->value('transfer_number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft'      => 'Draft',
            'pending'    => 'Menunggu Approval',
            'approved'   => 'Disetujui',
            'in_transit' => 'Dalam Perjalanan',
            'received'   => 'Diterima',
            'completed'  => 'Selesai',
            'cancelled'  => 'Dibatalkan',
            default      => ucfirst($this->status),
        };
    }

    public function canEdit():    bool { return in_array($this->status, ['draft', 'pending']); }
    public function canApprove(): bool { return $this->status === 'pending'; }
    public function canSend():    bool { return $this->status === 'approved'; }
    public function canReceive(): bool { return $this->status === 'in_transit'; }
    public function canCancel():  bool { return in_array($this->status, ['draft', 'pending', 'approved']); }
}
