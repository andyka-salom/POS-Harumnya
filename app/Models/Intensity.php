<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Intensity extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'oil_ratio',     // disimpan sebagai angka string: "1", "2", "3", dst
        'alcohol_ratio', // disimpan sebagai angka string: "1", "2", "4", dst
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function sizeQuantities(): HasMany
    {
        return $this->hasMany(IntensitySizeQuantity::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'intensity_id');
    }

    public function sizePrices(): HasMany
    {
        return $this->hasMany(IntensitySizePrice::class, 'intensity_id');
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    public function getStatusLabelAttribute(): string
    {
        return $this->is_active ? 'Aktif' : 'Non-Aktif';
    }

    /**
     * Ratio display dalam format "X : Y"
     * oil_ratio="1", alcohol_ratio="2" → "1 : 2"
     */
    public function getRatioDisplayAttribute(): string
    {
        $oil     = $this->oil_ratio     ?? '1';
        $alcohol = $this->alcohol_ratio ?? '1';
        return trim($oil) . ' : ' . trim($alcohol);
    }

    /**
     * Concentration level berdasarkan ratio numerik:
     * 1:4 (20%)  → light
     * 1:2 (33%)  → moderate
     * 1:1 (50%)  → strong
     * 2:1 (67%)  → extreme
     */
    public function getConcentrationLevelAttribute(): string
    {
        $pct = $this->getOilPercentage();

        if ($pct >= 60) return 'extreme';
        if ($pct >= 42) return 'strong';
        if ($pct >= 25) return 'moderate';
        return 'light';
    }

    /**
     * Label level konsentrasi untuk display
     */
    public function getConcentrationLabelAttribute(): string
    {
        $oil     = (int) ($this->oil_ratio     ?? 1);
        $alcohol = (int) ($this->alcohol_ratio ?? 1);

        // Match preset terdekat
        if ($oil === 1 && $alcohol === 4) return 'Body Mist';
        if ($oil === 1 && $alcohol === 2) return 'EDT';
        if ($oil === 1 && $alcohol === 1) return 'EDP';
        if ($oil === 2 && $alcohol === 1) return 'Extrait';

        // Fallback berdasarkan persentase
        return match($this->concentration_level) {
            'extreme'  => 'Extrait',
            'strong'   => 'EDP',
            'moderate' => 'EDT',
            default    => 'Body Mist',
        };
    }

    /**
     * Cek apakah semua size aktif sudah dikonfigurasi
     */
    public function getIsQuantityCompleteAttribute(): bool
    {
        $totalActiveSizes = Size::where('is_active', true)->count();
        $configuredSizes  = $this->sizeQuantities()->where('is_active', true)->count();

        return $totalActiveSizes > 0 && $configuredSizes >= $totalActiveSizes;
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($search) . '%'])
              ->orWhereRaw('LOWER(code) LIKE ?', ['%' . strtolower($search) . '%']);
        });
    }

    public function scopeActive($query, bool $active = true)
    {
        return $query->where('is_active', $active);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order', 'asc')
                     ->orderBy('name', 'asc');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Hitung oil percentage dari oil_ratio & alcohol_ratio (angka terpisah).
     * oil_ratio="1", alcohol_ratio="2" → 33.33
     * oil_ratio="2", alcohol_ratio="1" → 66.67
     */
    public function getOilPercentage(): float
    {
        $oil     = (float) ($this->oil_ratio     ?? 1);
        $alcohol = (float) ($this->alcohol_ratio ?? 1);
        $total   = $oil + $alcohol;

        if ($total <= 0) return 50.0;

        return round(($oil / $total) * 100, 4);
    }
}
