<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class RepackTransactionItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'repack_transaction_id', 'ingredient_id',
        'quantity', 'unit_cost', 'total_cost',
    ];

    protected $casts = [
        // Schema: bigInteger SIGNED — qty bahan yang dikonsumsi (positif dalam konteks normal)
        'quantity'   => 'integer',
        // Schema: decimal(15,4) — snapshot WAC bahan saat digunakan
        'unit_cost'  => 'decimal:4',
        // Schema: decimal(15,2) — quantity × unit_cost dalam rupiah (2 desimal)
        'total_cost' => 'decimal:2',
    ];

    // ─── Relationships ──────────────────────────────────────────────────────────

    public function repackTransaction()
    {
        return $this->belongsTo(RepackTransaction::class);
    }

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }
}