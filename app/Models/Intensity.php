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
        'oil_ratio',
        'alcohol_ratio',
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
     * Ratio display — kembalikan oil_ratio apa adanya (sudah dalam format "X : Y")
     */
    public function getRatioDisplayAttribute(): string
    {
        return $this->oil_ratio ?? '1 : 1';
    }

    /**
     * Hitung oil percentage dari string ratio untuk keperluan tampilan & bar.
     * Contoh: "1 : 2" → 33.33, "1 : 1" → 50, "2 : 1" → 66.67
     */
    public function getOilPercentageAttribute(): float
    {
        return $this->parseOilPercentage($this->oil_ratio);
    }

    /**
     * Concentration level berdasarkan oil_ratio string:
     *   "1 : 4" → light   (Body Mist ~20%)
     *   "1 : 2" → moderate (EDT ~33%)
     *   "1 : 1" → strong   (EDP ~50%)
     *   "2 : 1" → extreme  (Extrait ~67%)
     */
    public function getConcentrationLevelAttribute(): string
    {
        $pct = $this->parseOilPercentage($this->oil_ratio);

        if ($pct >= 60) return 'extreme';
        if ($pct >= 42) return 'strong';
        if ($pct >= 25) return 'moderate';
        return 'light';
    }

    /**
     * Cek apakah semua size sudah dikonfigurasi quantitynya
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
     * Parse string ratio "X : Y" → oil percentage (float)
     * Contoh: "1 : 2" → 33.33, "2 : 1" → 66.67
     */
    public function parseOilPercentage(string $ratio): float
    {
        // Format: "X : Y" atau "X:Y"
        $parts = preg_split('/\s*:\s*/', trim($ratio));

        if (count($parts) !== 2) return 50.0;

        $o = (float) $parts[0];
        $a = (float) $parts[1];

        if (($o + $a) == 0) return 50.0;

        return round(($o / ($o + $a)) * 100, 4);
    }
}
