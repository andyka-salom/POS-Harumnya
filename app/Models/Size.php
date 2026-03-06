<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Size extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'volume_ml',
        'name',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'volume_ml'  => 'integer',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Human-readable label: "100 ml", "30 ml", dst.
     */
    public function getVolumeLabelAttribute(): string
    {
        return "{$this->volume_ml} ml";
    }

    /**
     * Size category berdasarkan volume_ml.
     * Bisa disesuaikan sesuai kebutuhan bisnis.
     */
    public function getSizeCategoryAttribute(): string
    {
        return match (true) {
            $this->volume_ml >= 100 => 'large',
            $this->volume_ml >= 50  => 'medium',
            default                 => 'small',
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return $this->is_active ? 'Aktif' : 'Non-Aktif';
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($search) . '%']);

            // Tambahkan kondisi pencarian volume_ml secara numerik jika input adalah angka
            // Atau sebagai string jika input mungkin mengandung teks lain yang relevan
            if (is_numeric($search)) {
                $q->orWhere('volume_ml', (int) $search); // Cari volume yang sama persis
                // Atau untuk pencarian "mengandung", bisa menggunakan:
                // $q->orWhere('volume_ml', 'LIKE', "%{$search}%");
            } else {
                // Jika input bukan angka, kita tetap bisa mencari bagian dari angka
                $q->orWhereRaw('CAST(volume_ml AS CHAR) LIKE ?', ["%{$search}%"]);
            }
        });
    }

    public function scopeActive($query, bool $active = true)
    {
        return $query->where('is_active', $active);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order', 'asc')
                     ->orderBy('volume_ml', 'asc');
    }
}
