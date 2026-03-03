<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * PRODUCT SEEDER
 * =================================================================
 * Seeds tabel `products` dengan semua kombinasi:
 *   Variant (8) × Intensity (3: EDT/EDP/EXT) × Size (3: 30/50/100ml)
 *   = 72 produk aktif
 *
 * Kolom yang di-seed berdasarkan migration 004:
 *   products: id, variant_id, intensity_id, size_id, sku, name,
 *             is_made_to_order, is_active, notes, created_at, updated_at
 *
 * HARUS dijalankan SETELAH:
 *   - VariantSeeder
 *   - IntensitySeeder  (mengisi intensities + sizes)
 * =================================================================
 */
class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $variants    = DB::table('variants')->where('is_active', true)->get();
        $intensities = DB::table('intensities')->where('is_active', true)->get();
        $sizes       = DB::table('sizes')->where('is_active', true)->get();

        if ($variants->isEmpty() || $intensities->isEmpty() || $sizes->isEmpty()) {
            $this->command->error('Variants / Intensities / Sizes belum ada. Jalankan VariantSeeder & IntensitySeeder terlebih dahulu.');
            return;
        }

        $count = 0;

        foreach ($variants as $variant) {
            foreach ($intensities as $intensity) {
                foreach ($sizes as $size) {

                    // Cek apakah sudah ada (idempotent)
                    $exists = DB::table('products')
                        ->where('variant_id',   $variant->id)
                        ->where('intensity_id', $intensity->id)
                        ->where('size_id',      $size->id)
                        ->exists();

                    if ($exists) continue;

                    // SKU: contoh NAG-EDT-50
                    $sku  = strtoupper($variant->code) . '-' . strtoupper($intensity->code) . '-' . $size->volume_ml;

                    // Nama produk: "Nagabonar - Reguler (EDT) - 50ml"
                    $name = $variant->name . ' - ' . $intensity->name . ' (' . $intensity->code . ') - ' . $size->volume_ml . 'ml';

                    DB::table('products')->insert([
                        'id'               => Str::uuid(),
                        'variant_id'       => $variant->id,
                        'intensity_id'     => $intensity->id,
                        'size_id'          => $size->id,
                        'sku'              => $sku,
                        'name'             => $name,
                        'is_made_to_order' => false,
                        'is_active'        => true,
                        'notes'            => null,
                        'created_at'       => $now,
                        'updated_at'       => $now,
                    ]);

                    $count++;
                }
            }
        }

        $this->command->info("Products seeded: {$count} produk (variant × intensity × size).");
    }
}
