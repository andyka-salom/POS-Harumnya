<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB; // <-- Baris ini yang sebelumnya kurang
use Illuminate\Support\Str;

class IntensitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        DB::beginTransaction();

        try {
            // ==========================================================
            // 1. SEED SIZES (Ukuran Botol)
            // ==========================================================
            $this->command->info('Seeding Sizes...');

            $sizesData = [
                ['volume' => 30,  'name' => '30 mL'],
                ['volume' => 50,  'name' => '50 mL'],
                ['volume' => 100, 'name' => '100 mL'],
            ];

            // Array untuk menyimpan ID Size berdasarkan Volume untuk referensi nanti
            $sizeMap = [];

            foreach ($sizesData as $index => $s) {
                // Kita cari dulu apakah data sudah ada
                $existing = DB::table('sizes')->where('volume_ml', $s['volume'])->first();
                $id = $existing ? $existing->id : Str::uuid()->toString();

                DB::table('sizes')->updateOrInsert(
                    ['volume_ml' => $s['volume']],
                    [
                        'id' => $id,
                        'name' => $s['name'],
                        'sort_order' => $index + 1,
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );

                $sizeMap[$s['volume']] = $id;
            }

            // ==========================================================
            // 2. SEED INTENSITIES (Konsentrasi)
            // ==========================================================
            $this->command->info('Seeding Intensities...');

            $intensitiesData = [
                [
                    'code' => 'EDT',
                    'name' => 'Eau de Toilette',
                    'oil_ratio' => 1,
                    'alcohol_ratio' => 2,
                    'concentration_percentage' => 33.00,
                    'sort_order' => 1
                ],
                [
                    'code' => 'EDP',
                    'name' => 'Eau de Parfum',
                    'oil_ratio' => 1,
                    'alcohol_ratio' => 1,
                    'concentration_percentage' => 50.00,
                    'sort_order' => 2
                ],
                [
                    'code' => 'EXT', // Sesuai migration: EXT
                    'name' => 'Extrait de Parfum',
                    'oil_ratio' => 2,
                    'alcohol_ratio' => 1,
                    'concentration_percentage' => 65.00,
                    'sort_order' => 3
                ],
            ];

            // Array untuk menyimpan ID Intensity berdasarkan Code
            $intensityMap = [];

            foreach ($intensitiesData as $i) {
                $existing = DB::table('intensities')->where('code', $i['code'])->first();
                $id = $existing ? $existing->id : Str::uuid()->toString();

                DB::table('intensities')->updateOrInsert(
                    ['code' => $i['code']],
                    [
                        'id' => $id,
                        'name' => $i['name'],
                        'oil_ratio' => $i['oil_ratio'],
                        'alcohol_ratio' => $i['alcohol_ratio'],
                        'concentration_percentage' => $i['concentration_percentage'],
                        'sort_order' => $i['sort_order'],
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );

                $intensityMap[$i['code']] = $id;
            }

            // ==========================================================
            // 3. SEED PRICES AND QUANTITIES (Relasi Many-to-Many)
            // ==========================================================
            $this->command->info('Seeding Prices & Quantities...');

            /*
             * Matrix Data sesuai instruksi Migration
             */
            $matrix = [
                'EDT' => [
                    30  => ['price' => 46000,  'oil' => 10, 'alc' => 20],
                    50  => ['price' => 64000,  'oil' => 15, 'alc' => 35],
                    100 => ['price' => 120000, 'oil' => 35, 'alc' => 65],
                ],
                'EDP' => [
                    30  => ['price' => 60000,  'oil' => 15, 'alc' => 15],
                    50  => ['price' => 85000,  'oil' => 25, 'alc' => 25],
                    100 => ['price' => 165000, 'oil' => 50, 'alc' => 50],
                ],
                'EXT' => [
                    30  => ['price' => 79000,  'oil' => 20, 'alc' => 10],
                    50  => ['price' => 118000, 'oil' => 35, 'alc' => 15],
                    100 => ['price' => 210000, 'oil' => 65, 'alc' => 35],
                ],
            ];

            foreach ($matrix as $code => $sizes) {
                $intensityId = $intensityMap[$code] ?? null;

                if (!$intensityId) continue;

                foreach ($sizes as $volume => $data) {
                    $sizeId = $sizeMap[$volume] ?? null;
                    if (!$sizeId) continue;

                    // A. Insert/Update Price
                    // Cek ID dulu agar UUID tidak berubah setiap seed
                    $existingPrice = DB::table('intensity_size_prices')
                        ->where('intensity_id', $intensityId)
                        ->where('size_id', $sizeId)
                        ->first();

                    $priceId = $existingPrice ? $existingPrice->id : Str::uuid()->toString();

                    DB::table('intensity_size_prices')->updateOrInsert(
                        [
                            'intensity_id' => $intensityId,
                            'size_id'      => $sizeId,
                        ],
                        [
                            'id'         => $priceId,
                            'price'      => $data['price'],
                            'is_active'  => true,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]
                    );

                    // B. Insert/Update Quantities (Kalibrasi Manual)
                    $totalVolume = $data['oil'] + $data['alc'];

                    if ($totalVolume != $volume) {
                        $this->command->warn("Warning: Volume mismatch for $code $volume ml. Oil+Alc=$totalVolume");
                    }

                    $existingQty = DB::table('intensity_size_quantities')
                        ->where('intensity_id', $intensityId)
                        ->where('size_id', $sizeId)
                        ->first();

                    $qtyId = $existingQty ? $existingQty->id : Str::uuid()->toString();

                    DB::table('intensity_size_quantities')->updateOrInsert(
                        [
                            'intensity_id' => $intensityId,
                            'size_id'      => $sizeId,
                        ],
                        [
                            'id'               => $qtyId,
                            'oil_quantity'     => $data['oil'],
                            'alcohol_quantity' => $data['alc'],
                            'total_volume'     => $totalVolume,
                            'is_active'        => true,
                            'created_at'       => $now,
                            'updated_at'       => $now,
                        ]
                    );
                }
            }

            DB::commit();
            $this->command->info('Intensity Data Seeded Successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Seeding Failed: ' . $e->getMessage());
        }
    }
}
