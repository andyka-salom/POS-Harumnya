<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IntensitySeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        DB::beginTransaction();

        try {
            // ================================================================
            // 1. SIZES
            // ================================================================
            $this->command->info('Seeding Sizes...');

            $sizesData = [
                ['volume' => 30,  'name' => '30 mL',  'sort_order' => 1],
                ['volume' => 50,  'name' => '50 mL',  'sort_order' => 2],
                ['volume' => 100, 'name' => '100 mL', 'sort_order' => 3],
            ];

            $sizeMap = []; // volume_ml => id

            foreach ($sizesData as $s) {
                $existing = DB::table('sizes')->where('volume_ml', $s['volume'])->first();
                $id = $existing ? $existing->id : Str::uuid()->toString();

                DB::table('sizes')->updateOrInsert(
                    ['volume_ml' => $s['volume']],
                    [
                        'id'         => $id,
                        'name'       => $s['name'],
                        'sort_order' => $s['sort_order'],
                        'is_active'  => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );

                $sizeMap[$s['volume']] = $id;
            }

            // ================================================================
            // 2. INTENSITIES
            // ================================================================
            // oil_ratio & alcohol_ratio adalah STRING sesuai migration 004
            // (contoh: '1:2', '1:1', '2:1')
            // concentration_percentage TIDAK ADA di migration 004 — dihapus
            // ================================================================
            $this->command->info('Seeding Intensities...');

            $intensitiesData = [
                [
                    'code'             => 'EDT',
                    'name'             => 'Eau de Toilette',
                    'oil_ratio'        => '1:2',   // 1 part oil : 2 part alcohol
                    'alcohol_ratio'    => '2:1',
                    'sort_order'       => 1,
                ],
                [
                    'code'             => 'EDP',
                    'name'             => 'Eau de Parfum',
                    'oil_ratio'        => '1:1',
                    'alcohol_ratio'    => '1:1',
                    'sort_order'       => 2,
                ],
                [
                    'code'             => 'EXT',
                    'name'             => 'Extrait de Parfum',
                    'oil_ratio'        => '2:1',   // 2 part oil : 1 part alcohol
                    'alcohol_ratio'    => '1:2',
                    'sort_order'       => 3,
                ],
            ];

            $intensityMap = []; // code => id

            foreach ($intensitiesData as $i) {
                $existing = DB::table('intensities')->where('code', $i['code'])->first();
                $id = $existing ? $existing->id : Str::uuid()->toString();

                DB::table('intensities')->updateOrInsert(
                    ['code' => $i['code']],
                    [
                        'id'            => $id,
                        'name'          => $i['name'],
                        'oil_ratio'     => $i['oil_ratio'],
                        'alcohol_ratio' => $i['alcohol_ratio'],
                        'sort_order'    => $i['sort_order'],
                        'is_active'     => true,
                        'created_at'    => $now,
                        'updated_at'    => $now,
                    ]
                );

                $intensityMap[$i['code']] = $id;
            }

            // ================================================================
            // 3. INTENSITY SIZE PRICES & QUANTITIES
            // ================================================================
            // intensity_size_quantities.total_volume wajib diisi (kolom di DB)
            // total_volume harus = oil_quantity + alcohol_quantity
            // ================================================================
            $this->command->info('Seeding Intensity Size Prices & Quantities...');

            /**
             * Matrix: code => volume => [price, oil (ml), alc (ml)]
             * Sumber: kalibrasi manual — oil + alc HARUS = volume
             */
            $matrix = [
                'EDT' => [
                    30  => ['price' =>  46000, 'oil' => 10, 'alc' => 20],
                    50  => ['price' =>  64000, 'oil' => 15, 'alc' => 35],
                    100 => ['price' => 120000, 'oil' => 35, 'alc' => 65],
                ],
                'EDP' => [
                    30  => ['price' =>  60000, 'oil' => 15, 'alc' => 15],
                    50  => ['price' =>  85000, 'oil' => 25, 'alc' => 25],
                    100 => ['price' => 165000, 'oil' => 50, 'alc' => 50],
                ],
                'EXT' => [
                    30  => ['price' =>  79000, 'oil' => 20, 'alc' => 10],
                    50  => ['price' => 118000, 'oil' => 35, 'alc' => 15],
                    100 => ['price' => 210000, 'oil' => 65, 'alc' => 35],
                ],
            ];

            foreach ($matrix as $code => $sizes) {
                $intensityId = $intensityMap[$code] ?? null;
                if (! $intensityId) {
                    $this->command->warn("Intensity '$code' tidak ditemukan, skip.");
                    continue;
                }

                foreach ($sizes as $volume => $data) {
                    $sizeId = $sizeMap[$volume] ?? null;
                    if (! $sizeId) {
                        $this->command->warn("Size {$volume}ml tidak ditemukan, skip.");
                        continue;
                    }

                    $totalVolume = $data['oil'] + $data['alc'];

                    // Validasi kalibasi
                    if ($totalVolume !== $volume) {
                        $this->command->warn(
                            "⚠ Volume mismatch {$code} {$volume}ml: " .
                            "oil({$data['oil']}) + alc({$data['alc']}) = {$totalVolume}"
                        );
                    }

                    // ── intensity_size_prices ─────────────────────────────
                    $existingPrice = DB::table('intensity_size_prices')
                        ->where('intensity_id', $intensityId)
                        ->where('size_id', $sizeId)
                        ->first();

                    DB::table('intensity_size_prices')->updateOrInsert(
                        [
                            'intensity_id' => $intensityId,
                            'size_id'      => $sizeId,
                        ],
                        [
                            'id'         => $existingPrice ? $existingPrice->id : Str::uuid()->toString(),
                            'price'      => $data['price'],
                            'is_active'  => true,
                            'notes'      => null,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]
                    );

                    // ── intensity_size_quantities ─────────────────────────
                    $existingQty = DB::table('intensity_size_quantities')
                        ->where('intensity_id', $intensityId)
                        ->where('size_id', $sizeId)
                        ->first();

                    DB::table('intensity_size_quantities')->updateOrInsert(
                        [
                            'intensity_id' => $intensityId,
                            'size_id'      => $sizeId,
                        ],
                        [
                            'id'               => $existingQty ? $existingQty->id : Str::uuid()->toString(),
                            'oil_quantity'     => $data['oil'],
                            'alcohol_quantity' => $data['alc'],
                            'total_volume'     => $totalVolume, // wajib diisi sesuai migration
                            'is_active'        => true,
                            'notes'            => null,
                            'created_at'       => $now,
                            'updated_at'       => $now,
                        ]
                    );
                }
            }

            DB::commit();
            $this->command->info('✓ IntensitySeeder selesai.');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Seeding gagal: ' . $e->getMessage());
            throw $e; // re-throw agar artisan db:seed menampilkan stack trace
        }
    }
}
