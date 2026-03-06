<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * DISCOUNT SEEDER
 * ===============================================================
 * 4 Program Promo:
 *
 *   1. PLINKO (game_reward)
 *      Syarat : beli >= 2 pcs P50 (semua intensitas & varian)
 *      Reward : spin Plinko → 1 dari 4 hadiah
 *
 *   2. BUY 1 GET 1 (buy_x_get_y)
 *      Syarat : beli 1 P50 EDP atau EXT (any variant)
 *      Reward : gratis 1 P50 EDT — varian ditentukan sistem
 *
 *   3. BUY 4 GET 1 (buy_x_get_y)
 *      Syarat : beli 4 P50 semua kategori & varian
 *      Reward : gratis 1 P50 EDT — varian ditentukan sistem
 *
 *   4. BUY 1 GET 3 (buy_x_get_y)
 *      Syarat : beli 1 P50 EDP atau EXT (any variant)
 *      Reward : gratis 2 P30 EDT (travel size) — varian ditentukan sistem
 * ===============================================================
 *
 * Disesuaikan dengan migration 008:
 *   - discount_types: tambah start_time, end_time (nullable TIME)
 *   - discount_types: priority = unsignedTinyInteger (max 255, nilai 10-20 aman)
 *   - discount_types: value = decimal default 0, BUKAN nullable
 *   - discount_stores: unique(discount_type_id, store_id) — PostgreSQL
 *     menganggap NULL != NULL sehingga multiple NULL store_id boleh
 *   - discount_applicabilities FK: cascadeOnDelete (bukan nullOnDelete)
 *   - discount_requirements FK: cascadeOnDelete
 */
class DiscountSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // ── Guard: pastikan master data sudah ada ─────────────────────────────
        $size50 = DB::table('sizes')->where('volume_ml', 50)->first();
        $size30 = DB::table('sizes')->where('volume_ml', 30)->first();
        $intEDT = DB::table('intensities')->where('code', 'EDT')->first();
        $intEDP = DB::table('intensities')->where('code', 'EDP')->first();
        $intEXT = DB::table('intensities')->where('code', 'EXT')->first();

        if (! $size50 || ! $size30 || ! $intEDT || ! $intEDP || ! $intEXT) {
            $this->command->error(
                'Master data sizes/intensities belum ada. ' .
                'Jalankan IntensitySeeder terlebih dahulu.'
            );
            return;
        }

        $s50 = $size50->id;
        $s30 = $size30->id;
        $edt = $intEDT->id;
        $edp = $intEDP->id;
        $ext = $intEXT->id;

        // ── Guard: skip jika sudah di-seed ────────────────────────────────────
        $existing = DB::table('discount_types')
            ->whereIn('code', ['PLINKO-P50', 'B1G1-P50-INTENSE', 'B4G1-P50-ALL', 'B1G3-P50-TRAVEL'])
            ->count();

        if ($existing > 0) {
            $this->command->warn('DiscountSeeder: data sudah ada, skip.');
            return;
        }

        DB::beginTransaction();

        try {

            // ==================================================================
            // 1. PLINKO
            // ==================================================================
            $dtPlinko = Str::uuid()->toString();

            DB::table('discount_types')->insert([
                'id'                    => $dtPlinko,
                'code'                  => 'PLINKO-P50',
                'name'                  => 'Plinko Spin — Beli 2 P50',
                'type'                  => 'game_reward',
                // migration: value decimal default 0, NOT nullable
                'value'                 => 0.00,
                'buy_quantity'          => 2,
                'get_quantity'          => 1,
                'get_product_type'      => 'choose_from_pool',
                'min_purchase_amount'   => null,
                'min_purchase_quantity' => 2,
                'max_discount_amount'   => null,
                'start_date'            => null,
                'end_date'              => null,
                // migration baru: start_time / end_time (TIME, nullable)
                'start_time'            => null,
                'end_time'              => null,
                'is_game_reward'        => true,
                'game_probability'      => 100,
                // unsignedTinyInteger max 255
                'priority'              => 10,
                'is_combinable'         => false,
                'is_active'             => true,
                'description'           => 'Spin Plinko gratis untuk setiap pembelian minimal 2 botol P50 (semua intensitas & varian). Hadiah: travel size 10ml, atomizer, room spray, atau pengharum mobil.',
                'terms_conditions'      => json_encode([
                    'Minimal pembelian 2 botol P50 (EDT / EDP / EXT, semua varian)',
                    'Berlaku 1x spin Plinko per transaksi',
                    'Hadiah tidak dapat ditukar uang tunai',
                    'Jenis hadiah ditentukan hasil spin - tidak bisa dipilih',
                ]),
                'created_at'            => $now,
                'updated_at'            => $now,
            ]);

            // Applicability: P50 semua variant & intensity
            DB::table('discount_applicabilities')->insert([
                'id'               => Str::uuid(),
                'discount_type_id' => $dtPlinko,
                'variant_id'       => null,
                'intensity_id'     => null,
                'size_id'          => $s50,
                'created_at'       => $now,
                'updated_at'       => $now,
            ]);

            // Requirement: min 2 pcs P50 apapun
            DB::table('discount_requirements')->insert([
                'id'                => Str::uuid(),
                'discount_type_id'  => $dtPlinko,
                'variant_id'        => null,
                'intensity_id'      => null,
                'size_id'           => $s50,
                'required_quantity' => 2,
                'matching_mode'     => 'all',
                'group_key'         => 'P50-ANY',
                'created_at'        => $now,
                'updated_at'        => $now,
            ]);

            // Reward: 1x pool item (is_pool = true)
            $rwPlinko = Str::uuid()->toString();
            DB::table('discount_rewards')->insert([
                'id'                  => $rwPlinko,
                'discount_type_id'    => $dtPlinko,
                'variant_id'          => null,
                'intensity_id'        => null,
                'size_id'             => null,
                'reward_quantity'     => 1,
                'customer_can_choose' => false,
                'is_pool'             => true,
                'max_choices'         => 1,
                'discount_percentage' => 100.00,
                'fixed_price'         => null,
                'priority'            => 1,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            // Pool items (equal probability 25 each)
            $plinkoItems = [
                ['label' => 'Travel Size Parfum 10ml', 'probability' => 25, 'sort_order' => 1],
                ['label' => 'Atomizer Portable',        'probability' => 25, 'sort_order' => 2],
                ['label' => 'Room Spray',               'probability' => 25, 'sort_order' => 3],
                ['label' => 'Pengharum Mobil',          'probability' => 25, 'sort_order' => 4],
            ];

            foreach ($plinkoItems as $item) {
                DB::table('discount_reward_pools')->insert([
                    'id'                 => Str::uuid(),
                    'discount_reward_id' => $rwPlinko,
                    'product_id'         => null,
                    'variant_id'         => null,
                    'intensity_id'       => null,
                    'size_id'            => null,
                    'label'              => $item['label'],
                    'image_url'          => null,
                    // migration: fixed_price nullable decimal(15,2)
                    'fixed_price'        => 0.00,
                    'probability'        => $item['probability'],
                    'is_active'          => true,
                    'sort_order'         => $item['sort_order'],
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ]);
            }

            $this->command->line('  [1/4] Plinko seeded');

            // ==================================================================
            // 2. BUY 1 GET 1
            // ==================================================================
            $dtB1G1 = Str::uuid()->toString();

            DB::table('discount_types')->insert([
                'id'                    => $dtB1G1,
                'code'                  => 'B1G1-P50-INTENSE',
                'name'                  => 'Buy 1 Get 1 — P50 Intense / Very Intense',
                'type'                  => 'buy_x_get_y',
                'value'                 => 0.00,
                'buy_quantity'          => 1,
                'get_quantity'          => 1,
                'get_product_type'      => 'lower_intensity',
                'min_purchase_amount'   => null,
                'min_purchase_quantity' => 1,
                'max_discount_amount'   => null,
                'start_date'            => null,
                'end_date'              => null,
                'start_time'            => null,
                'end_time'              => null,
                'is_game_reward'        => false,
                'game_probability'      => null,
                'priority'              => 20,
                'is_combinable'         => false,
                'is_active'             => true,
                'description'           => 'Beli 1 P50 Intense (EDP) atau Very Intense (EXT), gratis 1 P50 Reguler (EDT). Varian gratis ditentukan sistem (ws).',
                'terms_conditions'      => json_encode([
                    'Berlaku untuk P50 intensitas EDP atau EXT (semua varian)',
                    'Produk gratis: P50 EDT — varian ditentukan sistem (WS)',
                    'Customer tidak bisa memilih varian produk gratis',
                    'Tidak dapat digabung dengan promo lain',
                ]),
                'created_at'            => $now,
                'updated_at'            => $now,
            ]);

            // Applicabilities & Requirements: EDP OR EXT, P50
            // group_key sama → dievaluasi OR di level aplikasi
            foreach ([$edp, $ext] as $intId) {
                DB::table('discount_applicabilities')->insert([
                    'id'               => Str::uuid(),
                    'discount_type_id' => $dtB1G1,
                    'variant_id'       => null,
                    'intensity_id'     => $intId,
                    'size_id'          => $s50,
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ]);

                DB::table('discount_requirements')->insert([
                    'id'                => Str::uuid(),
                    'discount_type_id'  => $dtB1G1,
                    'variant_id'        => null,
                    'intensity_id'      => $intId,
                    'size_id'           => $s50,
                    'required_quantity' => 1,
                    'matching_mode'     => 'any',
                    'group_key'         => 'P50-EDP-OR-EXT',
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ]);
            }

            // Reward: 1x P50 EDT (intensity spesifik, variant null = ws)
            DB::table('discount_rewards')->insert([
                'id'                  => Str::uuid(),
                'discount_type_id'    => $dtB1G1,
                'variant_id'          => null,
                'intensity_id'        => $edt,
                'size_id'             => $s50,
                'reward_quantity'     => 1,
                'customer_can_choose' => false,
                'is_pool'             => false,
                'max_choices'         => null,
                'discount_percentage' => 100.00,
                'fixed_price'         => null,
                'priority'            => 1,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            $this->command->line('  [2/4] Buy 1 Get 1 seeded');

            // ==================================================================
            // 3. BUY 4 GET 1
            // ==================================================================
            $dtB4G1 = Str::uuid()->toString();

            DB::table('discount_types')->insert([
                'id'                    => $dtB4G1,
                'code'                  => 'B4G1-P50-ALL',
                'name'                  => 'Buy 4 Get 1 — P50 Semua Kategori',
                'type'                  => 'buy_x_get_y',
                'value'                 => 0.00,
                'buy_quantity'          => 4,
                'get_quantity'          => 1,
                'get_product_type'      => 'lower_intensity',
                'min_purchase_amount'   => null,
                'min_purchase_quantity' => 4,
                'max_discount_amount'   => null,
                'start_date'            => null,
                'end_date'              => null,
                'start_time'            => null,
                'end_time'              => null,
                'is_game_reward'        => false,
                'game_probability'      => null,
                'priority'              => 15,
                'is_combinable'         => false,
                'is_active'             => true,
                'description'           => 'Beli 4 botol P50 (semua intensitas & varian), gratis 1 botol P50 Reguler (EDT). Varian gratis ditentukan sistem.',
                'terms_conditions'      => json_encode([
                    'Berlaku untuk pembelian 4 botol P50 (EDT / EDP / EXT, semua varian)',
                    'Produk gratis: P50 EDT — varian ditentukan sistem',
                    'Customer tidak bisa memilih varian produk gratis',
                    'Tidak dapat digabung dengan promo lain',
                ]),
                'created_at'            => $now,
                'updated_at'            => $now,
            ]);

            DB::table('discount_applicabilities')->insert([
                'id'               => Str::uuid(),
                'discount_type_id' => $dtB4G1,
                'variant_id'       => null,
                'intensity_id'     => null,
                'size_id'          => $s50,
                'created_at'       => $now,
                'updated_at'       => $now,
            ]);

            DB::table('discount_requirements')->insert([
                'id'                => Str::uuid(),
                'discount_type_id'  => $dtB4G1,
                'variant_id'        => null,
                'intensity_id'      => null,
                'size_id'           => $s50,
                'required_quantity' => 4,
                'matching_mode'     => 'all',
                'group_key'         => 'P50-ANY-4PCS',
                'created_at'        => $now,
                'updated_at'        => $now,
            ]);

            DB::table('discount_rewards')->insert([
                'id'                  => Str::uuid(),
                'discount_type_id'    => $dtB4G1,
                'variant_id'          => null,
                'intensity_id'        => $edt,
                'size_id'             => $s50,
                'reward_quantity'     => 1,
                'customer_can_choose' => false,
                'is_pool'             => false,
                'max_choices'         => null,
                'discount_percentage' => 100.00,
                'fixed_price'         => null,
                'priority'            => 1,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            $this->command->line('  [3/4] Buy 4 Get 1 seeded');

            // ==================================================================
            // 4. BUY 1 GET 3
            //    get_quantity = 2 (2 botol P30 gratis)
            //    "Get 3" = total diterima 3 botol (1 P50 beli + 2 P30 gratis)
            // ==================================================================
            $dtB1G3 = Str::uuid()->toString();

            DB::table('discount_types')->insert([
                'id'                    => $dtB1G3,
                'code'                  => 'B1G3-P50-TRAVEL',
                'name'                  => 'Buy 1 Get 3 — P50 Intense + 2 Travel Size',
                'type'                  => 'buy_x_get_y',
                'value'                 => 0.00,
                'buy_quantity'          => 1,
                'get_quantity'          => 2,
                'get_product_type'      => 'specific',
                'min_purchase_amount'   => null,
                'min_purchase_quantity' => 1,
                'max_discount_amount'   => null,
                'start_date'            => null,
                'end_date'              => null,
                'start_time'            => null,
                'end_time'              => null,
                'is_game_reward'        => false,
                'game_probability'      => null,
                'priority'              => 18,
                'is_combinable'         => false,
                'is_active'             => true,
                'description'           => 'Beli 1 P50 Intense (EDP) atau Very Intense (EXT), gratis 2 botol Travel Size P30 (EDT). Varian travel size ditentukan sistem. Total dapat 3 botol.',
                'terms_conditions'      => json_encode([
                    'Berlaku untuk P50 intensitas EDP atau EXT (semua varian)',
                    'Produk gratis: 2 pcs P30 EDT (travel size) — varian ditentukan sistem',
                    'Customer tidak bisa memilih varian produk gratis',
                    'Total produk yang didapat: 1 P50 + 2 P30 = 3 botol',
                    'Tidak dapat digabung dengan promo lain',
                ]),
                'created_at'            => $now,
                'updated_at'            => $now,
            ]);

            foreach ([$edp, $ext] as $intId) {
                DB::table('discount_applicabilities')->insert([
                    'id'               => Str::uuid(),
                    'discount_type_id' => $dtB1G3,
                    'variant_id'       => null,
                    'intensity_id'     => $intId,
                    'size_id'          => $s50,
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ]);

                DB::table('discount_requirements')->insert([
                    'id'                => Str::uuid(),
                    'discount_type_id'  => $dtB1G3,
                    'variant_id'        => null,
                    'intensity_id'      => $intId,
                    'size_id'           => $s50,
                    'required_quantity' => 1,
                    'matching_mode'     => 'any',
                    'group_key'         => 'P50-EDP-OR-EXT-B1G3',
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ]);
            }

            // Reward: 2x P30 EDT
            DB::table('discount_rewards')->insert([
                'id'                  => Str::uuid(),
                'discount_type_id'    => $dtB1G3,
                'variant_id'          => null,
                'intensity_id'        => $edt,
                'size_id'             => $s30,
                'reward_quantity'     => 2,
                'customer_can_choose' => false,
                'is_pool'             => false,
                'max_choices'         => null,
                'discount_percentage' => 100.00,
                'fixed_price'         => null,
                'priority'            => 1,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            $this->command->line('  [4/4] Buy 1 Get 3 seeded');

            // ==================================================================
            // DISCOUNT STORES
            // store_id = null → berlaku di semua toko
            // uq_discount_store adalah UNIQUE(discount_type_id, store_id).
            // Di PostgreSQL NULL != NULL, sehingga multiple NULL rows diperbolehkan
            // pada satu discount_type_id yang berbeda.
            // ==================================================================
            foreach ([$dtPlinko, $dtB1G1, $dtB4G1, $dtB1G3] as $dtId) {
                DB::table('discount_stores')->insert([
                    'id'               => Str::uuid(),
                    'discount_type_id' => $dtId,
                    'store_id'         => null,
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ]);
            }

            DB::commit();

            $this->command->info('');
            $this->command->info('✓ DiscountSeeder selesai — 4 program promo berhasil di-seed.');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Seeding gagal: ' . $e->getMessage());
            throw $e;
        }
    }
}
