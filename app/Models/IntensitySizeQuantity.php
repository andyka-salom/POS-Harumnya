<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class IntensitySizeQuantity extends Model
{
    use HasUuids;

    protected $table = 'intensity_size_quantities';

    protected $fillable = [
        'intensity_id',
        'size_id',
        'oil_quantity',
        'alcohol_quantity',
        'other_quantity',
        'total_volume',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'oil_quantity'     => 'integer',
        'alcohol_quantity' => 'integer',
        'other_quantity'   => 'integer',
        'total_volume'     => 'integer',
        'is_active'        => 'boolean',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function intensity(): BelongsTo
    {
        return $this->belongsTo(Intensity::class);
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }

    // ─── Static Helpers ───────────────────────────────────────────────────────

    public static function getFor(string $intensityId, string $sizeId): ?self
    {
        return static::where('intensity_id', $intensityId)
            ->where('size_id', $sizeId)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Bulk insert dengan UUID yang di-generate manual.
     * Menggunakan insert() agar 1 query, tapi tetap aman karena
     * HasUuids::creating() tidak dipanggil saat bulk insert.
     *
     * @param  array<int, array{
     *     intensity_id: string,
     *     size_id: string,
     *     oil_quantity: int,
     *     alcohol_quantity: int,
     *     total_volume: int,
     *     is_active?: bool,
     *     notes?: string|null,
     * }> $rows
     */
    public static function bulkInsert(array $rows): void
    {
        if (empty($rows)) return;

        $now = now();

        $prepared = array_map(fn (array $row) => array_merge([
            'id'               => (string) Str::uuid(),
            'other_quantity'   => 0,
            'notes'            => null,
            'is_active'        => true,
            'created_at'       => $now,
            'updated_at'       => $now,
        ], $row), $rows);

        static::insert($prepared);
    }

    // ─── Accessors / Helpers ──────────────────────────────────────────────────

    /**
     * Ambil target quantity berdasarkan ingredient_type.
     *
     * @param  string $type  'oil' | 'alcohol' | 'other'
     */
    public function getTargetByType(string $type): int
    {
        return match($type) {
            'oil'     => (int) $this->oil_quantity,
            'alcohol' => (int) $this->alcohol_quantity,
            'other'   => (int) ($this->other_quantity ?? 0),
            default   => 0,
        };
    }

    /**
     * Validasi: oil + alcohol + other harus = total_volume.
     */
    public function isVolumeConsistent(): bool
    {
        $sum = $this->oil_quantity + $this->alcohol_quantity + ($this->other_quantity ?? 0);
        return $sum === (int) $this->total_volume;
    }

    /**
     * @deprecated Gunakan VariantRecipe::scaleCollection() untuk scaling akurat.
     */
    public function scaleQuantity(float $baseQty, float $baseTotalVolume): int
    {
        if ($baseTotalVolume <= 0) return 0;
        $raw = ($baseQty / $baseTotalVolume) * $this->total_volume;
        return (int) round($raw);
    }
}
