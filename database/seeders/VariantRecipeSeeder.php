<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * VARIANT RECIPE SEEDER
 * Seeds resep base (30ml) untuk setiap kombinasi Variant + Intensity.
 * Kolom base_quantity = qty untuk 30ml; di-scale oleh controller ke ukuran lain.
 *
 * Komposisi:
 *   EDT (1:2) → oil=10ml, alc=20ml dari total 30ml
 *   EDP (1:1) → oil=15ml, alc=15ml
 *   EXT (2:1) → oil=20ml, alc=10ml
 *
 * Setiap resep terdiri dari:
 *   - 1 Fragrance/Essential Oil (tipe oil, sesuai karakter varian)
 *   - 1 Base Oil (jojoba atau almond, pelengkap)
 *   - 1 Alcohol (ethanol 96%)
 *   - 1 Additive (vitamin E, jumlah kecil)
 */
class VariantRecipeSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // Lookup intensities
        $edt = DB::table('intensities')->where('code', 'EDT')->first();
        $edp = DB::table('intensities')->where('code', 'EDP')->first();
        $ext = DB::table('intensities')->where('code', 'EXT')->first();

        if (! $edt || ! $edp || ! $ext) {
            $this->command->error('Intensities belum ada.');
            return;
        }

        // Lookup ingredients
        $ingMap = DB::table('ingredients')->get()->keyBy('code');

        // Lookup variants
        $variants = DB::table('variants')->get();

        if ($variants->isEmpty()) {
            $this->command->error('Variants belum ada.');
            return;
        }

        // Oils per variant character (bergantian antara essential & fragrance oil)
        // Varian female cenderung floral (rose, jasmine), male/unisex woody/vanilla
        $variantOilMap = [
            'NAG'  => 'ING-EO-001', // Lavender
            'GRT'  => 'ING-FO-001', // Vanilla (green tea = soft sweet)
            'MRT'  => 'ING-EO-001', // Lavender (morning tea = soft)
            'ABE'  => 'ING-FO-002', // Sandalwood (blue emotion = woody)
            'FOF'  => 'ING-EO-003', // Jasmine (Flight of Fancy = floral)
            'BS'   => 'ING-FO-002', // Sandalwood (Blue Seduction = woody)
            'CLP'  => 'ING-EO-002', // Rose (Cloud Pink = rosy)
            'WANT' => 'ING-FO-002', // Sandalwood (The Most Wanted = oriental)
        ];

        $baseOilCodes   = ['ING-BO-001', 'ING-BO-002']; // Jojoba, Almond (bergantian)
        $alcoholCode    = 'ING-AL-001';
        $additiveCode   = 'ING-ADD-001';

        // Komposisi per intensity (total 30ml)
        // oil_ml = volume fragrance oil, alc_ml = volume alcohol, base_ml = base oil, add_ml = additive
        $intensityComposition = [
            // code => [oil_ml, alc_ml, base_ml, add_ml]
            // base_ml diambil dari porsi oil (bagi 2 antara fragrance & base oil)
            // Total: fragrance + base + alc + add = 30
            'EDT' => ['fragrance' => 7,  'base' => 3,  'alc' => 19, 'add' => 1],
            'EDP' => ['fragrance' => 10, 'base' => 4,  'alc' => 15, 'add' => 1],
            'EXT' => ['fragrance' => 14, 'base' => 5,  'alc' => 10, 'add' => 1],
        ];

        $intensities = [
            'EDT' => $edt,
            'EDP' => $edp,
            'EXT' => $ext,
        ];

        $baseOilToggle = 0; // bergantian antara jojoba dan almond

        foreach ($variants as $variant) {
            $oilCode  = $variantOilMap[$variant->code] ?? 'ING-FO-001';
            $oilIng   = $ingMap[$oilCode] ?? null;
            $baseOilCode = $baseOilCodes[$baseOilToggle % 2];
            $baseIng  = $ingMap[$baseOilCode] ?? null;
            $alcIng   = $ingMap[$alcoholCode] ?? null;
            $addIng   = $ingMap[$additiveCode] ?? null;
            $baseOilToggle++;

            if (! $oilIng || ! $baseIng || ! $alcIng || ! $addIng) continue;

            foreach ($intensities as $intCode => $intensity) {
                $comp = $intensityComposition[$intCode];

                $recipeLines = [
                    ['ingredient_id' => $oilIng->id,  'qty' => $comp['fragrance'], 'notes' => 'Fragrance / Essential Oil'],
                    ['ingredient_id' => $baseIng->id, 'qty' => $comp['base'],      'notes' => 'Base Oil (carrier)'],
                    ['ingredient_id' => $alcIng->id,  'qty' => $comp['alc'],       'notes' => 'Pelarut (Ethanol 96%)'],
                    ['ingredient_id' => $addIng->id,  'qty' => $comp['add'],       'notes' => 'Additive (Vitamin E)'],
                ];

                foreach ($recipeLines as $line) {
                    // Cek unique constraint sebelum insert
                    $exists = DB::table('variant_recipes')
                        ->where('variant_id', $variant->id)
                        ->where('intensity_id', $intensity->id)
                        ->where('ingredient_id', $line['ingredient_id'])
                        ->exists();

                    if ($exists) continue;

                    DB::table('variant_recipes')->insert([
                        'id'           => Str::uuid(),
                        'variant_id'   => $variant->id,
                        'intensity_id' => $intensity->id,
                        'ingredient_id'=> $line['ingredient_id'],
                        'base_quantity'=> $line['qty'],
                        'unit'         => 'ml',
                        'notes'        => $line['notes'],
                        'created_at'   => $now,
                        'updated_at'   => $now,
                    ]);
                }
            }
        }

        $total = DB::table('variant_recipes')->count();
        $this->command->info("Variant recipes seeded ({$total} recipe lines).");
    }
}
