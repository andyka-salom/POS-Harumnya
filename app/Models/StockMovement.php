<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class StockMovement extends Model
{
    use HasUuids;

    protected $fillable = [
        'location_type', 'location_id',
        'item_type', 'item_id',
        'movement_type',
        'reference_type', 'reference_id', 'reference_number',
        // ★ Migration 007: qty_change / qty_before / qty_after (bukan quantity/stock_before/stock_after)
        'qty_change',
        'qty_before',
        'qty_after',
        // ★ Migration 007: unit_cost decimal(15,4), total_cost decimal(15,2)
        'unit_cost',
        'total_cost',
        // avg_cost tetap decimal(15,4)
        'avg_cost_before',
        'avg_cost_after',
        'movement_date', 'notes', 'created_by',
    ];

    protected $casts = [
        // bigInteger SIGNED — qty bisa negatif (transfer_out, repack_out, dll)
        'qty_change'      => 'integer',
        'qty_before'      => 'integer',
        'qty_after'       => 'integer',
        // decimal(15,4) — snapshot WAC per unit saat transaksi
        'unit_cost'       => 'decimal:4',
        // decimal(15,2) — abs(qty_change) × unit_cost
        'total_cost'      => 'decimal:2',
        // decimal(15,4) — weighted average cost sebelum/sesudah
        'avg_cost_before' => 'decimal:4',
        'avg_cost_after'  => 'decimal:4',
        'movement_date'   => 'date',
        'created_by'      => 'integer',
    ];

    // ─── Relationships ──────────────────────────────────────────────────────────

    public function creator() { return $this->belongsTo(User::class, 'created_by'); }

    // ─── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeByType($query, string $type)
    {
        return $query->where('movement_type', $type);
    }

    public function scopeByLocation($query, string $type, string $id)
    {
        return $query->where('location_type', $type)->where('location_id', $id);
    }

    public function scopeByDateRange($query, string $from, string $to)
    {
        return $query->whereBetween('movement_date', [$from, $to]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    /** Masuk: qty_change positif */
    public function isIn():  bool { return $this->qty_change > 0; }
    /** Keluar: qty_change negatif */
    public function isOut(): bool { return $this->qty_change < 0; }

    public function getMovementTypeLabelAttribute(): string
    {
        return match ($this->movement_type) {
            'purchase_in'    => 'Pembelian Masuk',
            'transfer_in'    => 'Transfer Masuk',
            'transfer_out'   => 'Transfer Keluar',
            'repack_in'      => 'Repack Masuk',
            'repack_out'     => 'Repack Keluar',
            'production_in'  => 'Produksi Masuk',
            'production_out' => 'Produksi Keluar',
            'sales_out'      => 'Penjualan',
            'adjustment_in'  => 'Penyesuaian (+)',
            'adjustment_out' => 'Penyesuaian (-)',
            'waste'          => 'Waste/Rusak',
            'return_in'      => 'Retur Masuk',
            'return_out'     => 'Retur Keluar',
            default          => ucwords(str_replace('_', ' ', $this->movement_type)),
        };
    }
}
