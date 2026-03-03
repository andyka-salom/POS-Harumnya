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
        'concentration_percentage',
        'sort_order',
        'is_active'
    ];

    protected $casts = [
        'is_active'                => 'boolean',
        'oil_ratio'                => 'float',
        'alcohol_ratio'            => 'float',
        'concentration_percentage' => 'float',
        'sort_order'               => 'integer',
        'created_at'               => 'datetime',
        'updated_at'               => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Volume oil & alcohol yang sudah dikalibrasi per ukuran botol
     * Contoh: EDT 30ml → oil=10, alcohol=20 | EDT 50ml → oil=15, alcohol=35
     */
    public function sizeQuantities(): HasMany
    {
        return $this->hasMany(IntensitySizeQuantity::class);
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    public function getStatusLabelAttribute(): string
    {
        return $this->is_active ? 'Aktif' : 'Non-Aktif';
    }

    /**
     * Ratio display dalam format "oil : alkohol"
     * Contoh: oil=33.3, alkoh=66.7 => "1 : 2"
     */
    public function getRatioDisplayAttribute(): string
    {
        $oil   = (float) $this->oil_ratio;
        $alkoh = (float) $this->alcohol_ratio;

        if ($alkoh == 0) return "{$oil} : 0";

        $oilInt   = (int) round($oil * 10);
        $alkohInt = (int) round($alkoh * 10);
        $gcd      = $this->gcd($oilInt, $alkohInt);

        $o = $oilInt / $gcd;
        $a = $alkohInt / $gcd;

        $oStr = ($o == (int) $o) ? (int) $o : $o;
        $aStr = ($a == (int) $a) ? (int) $a : $a;

        return "{$oStr} : {$aStr}";
    }

    /**
     * Concentration level berdasarkan oil_ratio:
     *   EDT    (1:2) → oil ~33%  → moderate
     *   EDP    (1:1) → oil ~50%  → strong
     *   Extrait(2:1) → oil ~67%  → extreme
     */
    public function getConcentrationLevelAttribute(): string
    {
        $oil = (float) $this->oil_ratio;

        if ($oil >= 67) return 'extreme';
        if ($oil >= 50) return 'strong';
        if ($oil >= 33) return 'moderate';
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
                     ->orderBy('oil_ratio', 'desc');
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (Intensity $intensity) {
            $intensity->alcohol_ratio             = round(100 - $intensity->oil_ratio, 4);
            $intensity->concentration_percentage  = $intensity->oil_ratio;
        });
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function gcd(int $a, int $b): int
    {
        return $b === 0 ? $a : $this->gcd($b, $a % $b);
    }
        public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'intensity_id');
    }

    public function sizePrices(): HasMany
    {
        return $this->hasMany(IntensitySizePrice::class, 'intensity_id');
    }

}
