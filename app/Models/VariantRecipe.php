<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

class VariantRecipe extends Model
{
    use HasUuids;

    protected $fillable = [
        'variant_id',
        'intensity_id',
        'ingredient_id',
        'base_quantity',
        'unit',
        'notes',
    ];

    protected $casts = [
        'base_quantity' => 'decimal:4',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function variant(): BelongsTo
    {
        return $this->belongsTo(Variant::class);
    }

    public function intensity(): BelongsTo
    {
        return $this->belongsTo(Intensity::class);
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeForVariantIntensity($query, string $variantId, string $intensityId)
    {
        return $query->where('variant_id', $variantId)
                     ->where('intensity_id', $intensityId);
    }

    // ─── Static: Scale seluruh collection ────────────────────────────────────

    /**
     * Scale seluruh recipe collection ke ukuran target menggunakan
     * IntensitySizeQuantity sebagai acuan volume per tipe bahan.
     *
     * Algoritma:
     *   1. Kelompokkan bahan berdasarkan ingredient_type (oil / alcohol / other)
     *   2. Ambil target volume per tipe dari IntensitySizeQuantity
     *      → oil_quantity    untuk semua bahan ber-tipe 'oil'
     *      → alcohol_quantity untuk semua bahan ber-tipe 'alcohol'
     *      → other_quantity  untuk semua bahan ber-tipe 'other'
     *   3. Scale setiap bahan secara proporsional dalam grupnya
     *   4. Terapkan Largest Remainder Method per grup agar total tiap tipe
     *      selalu tepat integer (tidak ada selisih akibat pembulatan)
     *
     * Catatan:
     *   - Koleksi $recipes WAJIB sudah eager-load 'ingredient.category'
     *   - Hasilnya array indexed by recipe index → scaled_quantity (integer)
     *
     * @param  Collection          $recipes      Collection of VariantRecipe
     * @param  IntensitySizeQuantity $intensityQty Kalibrasi untuk intensity + size ini
     * @return array<int, int>    Map: index recipe → scaled quantity (ml, integer)
     */
    public static function scaleCollection(
        Collection $recipes,
        IntensitySizeQuantity $intensityQty
    ): array {
        // Target volume per tipe dari IntensitySizeQuantity
        $targetByType = [
            'oil'     => (int) $intensityQty->oil_quantity,
            'alcohol' => (int) $intensityQty->alcohol_quantity,
            'other'   => (int) ($intensityQty->other_quantity ?? 0),
        ];

        // Hitung base volume per tipe dari recipe
        $baseByType = ['oil' => 0.0, 'alcohol' => 0.0, 'other' => 0.0];
        foreach ($recipes as $recipe) {
            $type = $recipe->ingredient->category->ingredient_type ?? 'other';
            $baseByType[$type] += (float) $recipe->base_quantity;
        }

        // Susun grup: type → [index, base_quantity]
        $groups = [];
        foreach ($recipes as $idx => $recipe) {
            $type = $recipe->ingredient->category->ingredient_type ?? 'other';
            $groups[$type][] = [
                'index'    => $idx,
                'base_qty' => (float) $recipe->base_quantity,
            ];
        }

        $result = [];

        foreach ($groups as $type => $items) {
            $target  = $targetByType[$type] ?? 0;
            $baseSum = $baseByType[$type];

            if ($baseSum <= 0 || $target <= 0) {
                // Tidak ada target → semua 0
                foreach ($items as $item) {
                    $result[$item['index']] = 0;
                }
                continue;
            }

            // Hitung raw (float) scaled quantity per bahan dalam grup ini
            $raws = array_map(fn($item) => [
                'index' => $item['index'],
                'raw'   => ($item['base_qty'] / $baseSum) * $target,
            ], $items);

            // Largest Remainder Method — agar sum = $target (exact integer)
            $floors     = array_map(fn($r) => (int) floor($r['raw']), $raws);
            $totalFloor = array_sum($floors);
            $remainder  = $target - $totalFloor; // berapa unit yang perlu didistribusikan

            // Urutkan berdasarkan remainder terbesar untuk distribusi yang adil
            $indexed = array_map(fn($r, $f) => [
                'index'     => $r['index'],
                'floor'     => $f,
                'remainder' => $r['raw'] - $f,
            ], $raws, $floors);

            usort($indexed, fn($a, $b) => $b['remainder'] <=> $a['remainder']);

            foreach ($indexed as $i => $entry) {
                $result[$entry['index']] = $entry['floor'] + ($i < $remainder ? 1 : 0);
            }
        }

        ksort($result);
        return $result;
    }

    /**
     * Scale SATU recipe untuk satu size tertentu.
     *
     * Catatan: Metode ini untuk single-recipe scaling.
     * Untuk multi-ingredient (akurasi lebih baik), gunakan scaleCollection().
     * Ingredient WAJIB sudah di-load dengan relasi category.
     *
     * @param  IntensitySizeQuantity $intensityQty
     * @param  float                 $baseTotalByType Total base qty sesama tipe ingredient ini
     * @return int Scaled quantity (ml, integer)
     */
    public function getScaledQty(
        IntensitySizeQuantity $intensityQty,
        float $baseTotalByType
    ): int {
        if ($baseTotalByType <= 0) return 0;

        $type = $this->ingredient->category->ingredient_type ?? 'other';

        $targetByType = [
            'oil'     => (int) $intensityQty->oil_quantity,
            'alcohol' => (int) $intensityQty->alcohol_quantity,
            'other'   => (int) ($intensityQty->other_quantity ?? 0),
        ];

        $target = $targetByType[$type] ?? 0;
        $raw    = ((float) $this->base_quantity / $baseTotalByType) * $target;

        return (int) round($raw);
    }

    // ─── Fallback (tanpa IntensitySizeQuantity) ───────────────────────────────

    /**
     * Scale sederhana berdasarkan scale factor (float → integer).
     * Hanya digunakan jika IntensitySizeQuantity belum dikonfigurasi.
     *
     * @param  float $baseTotalVolume  Total volume semua bahan di base recipe
     * @param  int   $targetVolumeMl  Target volume size dalam ml
     * @return int
     */
    public function getFallbackScaledQty(float $baseTotalVolume, int $targetVolumeMl): int
    {
        if ($baseTotalVolume <= 0) return 0;
        $proportion = (float) $this->base_quantity / $baseTotalVolume;
        return (int) round($proportion * $targetVolumeMl);
    }

    // ─── Deprecated ──────────────────────────────────────────────────────────

    /**
     * @deprecated Gunakan scaleCollection() untuk hasil integer yang akurat.
     */
    public function getScaledQuantity(int $targetSizeInMl): float
    {
        return round((float) $this->base_quantity * ($targetSizeInMl / 30), 4);
    }
}
