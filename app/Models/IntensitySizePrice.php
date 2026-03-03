<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntensitySizePrice extends Model
{
    use HasFactory, HasUuids;

    // Migration tidak pakai SoftDeletes — tidak kita tambahkan
    protected $table = 'intensity_size_prices';

    protected $fillable = [
        'intensity_id',
        'size_id',
        'price',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'price'      => 'decimal:2',
        'is_active'  => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function intensity(): BelongsTo
    {
        return $this->belongsTo(Intensity::class);
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Harga dalam format Rupiah: "Rp 150.000"
     */
    public function getPriceFormattedAttribute(): string
    {
        return 'Rp ' . number_format((float) $this->price, 0, ',', '.');
    }

    public function getStatusLabelAttribute(): string
    {
        return $this->is_active ? 'Aktif' : 'Non-Aktif';
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive($query, bool $active = true)
    {
        return $query->where('is_active', $active);
    }

    /**
     * Search melewati relasi intensity & size, plus notes.
     * Menggunakan whereHas agar index DB pada tabel relasi tetap dipakai.
     */
    public function scopeSearch($query, string $search)
    {
        $term = strtolower($search);

        return $query->where(function ($q) use ($term) {
            $q->whereHas('intensity', fn ($sq) =>
                $sq->whereRaw('LOWER(name) LIKE ?', ["%{$term}%"])
                   ->orWhereRaw('LOWER(code) LIKE ?', ["%{$term}%"])
            )
            ->orWhereHas('size', fn ($sq) =>
                $sq->whereRaw('LOWER(name) LIKE ?', ["%{$term}%"])
                   ->orWhereRaw('CAST(volume_ml AS CHAR) LIKE ?', ["%{$term}%"])
            )
            ->orWhereRaw('LOWER(notes) LIKE ?', ["%{$term}%"]);
        });
    }

    public function scopeOrdered($query)
    {
        return $query->latest('created_at');
    }
}
