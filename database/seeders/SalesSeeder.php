<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * SALES SEEDER — Data Dummy Penjualan Lengkap
 * =====================================================================
 * PERBAIKAN: sale_items.product_id diisi dari tabel products
 * agar query Dashboard yang JOIN ke products bisa berjalan.
 *
 * Tabel yang di-seed:
 *   - sales
 *   - sale_items            ← product_id valid dari tabel products
 *   - sale_item_packagings
 *   - sale_payments
 *   - sale_discounts
 *   - sale_returns + sale_return_items
 *   - discount_usages
 *   - stock_movements
 *   - customer_point_ledgers
 *
 * Prasyarat: ProductSeeder sudah dijalankan.
 * =====================================================================
 */
class SalesSeeder extends Seeder
{
    private array   $products    = []; // [variant_id][intensity_id][size_id] => product
    private array   $variants    = [];
    private array   $intensities = [];
    private array   $sizes       = [];
    private array   $prices      = [];
    private array   $packagings  = [];
    private array   $customers   = [];
    private array   $salesPeople = [];
    private array   $payMethods  = [];
    private array   $discounts   = [];
    private ?object $store1      = null;
    private ?object $store2      = null;
    private ?object $cashier1    = null;
    private ?object $cashier2    = null;
    private int     $saleCounter = 0;

    private const COMPOSITION = [
        'EDT' => ['fragrance' => 7,  'base' => 3,  'alc' => 19, 'add' => 1],
        'EDP' => ['fragrance' => 10, 'base' => 4,  'alc' => 15, 'add' => 1],
        'EXT' => ['fragrance' => 14, 'base' => 5,  'alc' => 10, 'add' => 1],
    ];

    // =========================================================================
    public function run(): void
    {
        $this->command->info('Loading master data...');
        $this->loadMasterData();

        if (empty($this->products)) {
            $this->command->error('Tabel products kosong. Jalankan ProductSeeder terlebih dahulu.');
            return;
        }
        if (! $this->store1 || ! $this->store2) {
            $this->command->error('Stores belum ada.');
            return;
        }

        DB::beginTransaction();
        try {
            $this->command->info('Seeding sales...');

            // ── Januari 2025 ──────────────────────────────────────────────────
            $this->seedDay('2025-01-05', $this->store1, 4, []);
            $this->seedDay('2025-01-06', $this->store2, 3, []);
            $this->seedDay('2025-01-08', $this->store1, 5, ['plinko']);
            $this->seedDay('2025-01-10', $this->store2, 4, ['b1g1']);
            $this->seedDay('2025-01-12', $this->store1, 3, []);
            $this->seedDay('2025-01-15', $this->store2, 6, ['b4g1']);
            $this->seedDay('2025-01-18', $this->store1, 4, []);
            $this->seedDay('2025-01-20', $this->store2, 5, ['b1g3']);
            $this->seedDay('2025-01-22', $this->store1, 3, []);
            $this->seedDay('2025-01-25', $this->store2, 4, []);

            // ── Februari 2025 ─────────────────────────────────────────────────
            $this->seedDay('2025-02-01', $this->store1, 5, ['plinko']);
            $this->seedDay('2025-02-03', $this->store2, 4, []);
            $this->seedDay('2025-02-05', $this->store1, 6, ['b1g1', 'b4g1']);
            $this->seedDay('2025-02-08', $this->store2, 3, []);
            $this->seedDay('2025-02-10', $this->store1, 5, ['b1g3']);
            $this->seedDay('2025-02-14', $this->store2, 8, ['plinko', 'b1g1']); // Valentine
            $this->seedDay('2025-02-18', $this->store1, 4, []);
            $this->seedDay('2025-02-22', $this->store2, 5, ['b4g1']);
            $this->seedDay('2025-02-25', $this->store1, 3, []);
            $this->seedDay('2025-02-28', $this->store2, 4, []);

            // ── Maret 2025 ────────────────────────────────────────────────────
            $this->seedDay('2025-03-01', $this->store1, 5, []);
            $this->seedDay('2025-03-05', $this->store2, 4, ['plinko']);
            $this->seedDay('2025-03-08', $this->store1, 6, ['b1g1']);
            $this->seedDay('2025-03-12', $this->store2, 3, []);
            $this->seedDay('2025-03-15', $this->store1, 5, ['b1g3']);
            $this->seedDay('2025-03-18', $this->store2, 4, []);
            $this->seedDay('2025-03-20', $this->store1, 7, ['b4g1', 'plinko']);
            $this->seedDay('2025-03-22', $this->store2, 3, []);
            $this->seedDay('2025-03-25', $this->store1, 4, []);
            $this->seedDay('2025-03-28', $this->store2, 5, ['b1g1']);

            $this->seedReturn();

            DB::commit();

            $this->command->info('');
            $this->command->info('✅ Sales seeded!');
            $this->command->info('  sales                : ' . DB::table('sales')->count());
            $this->command->info('  sale_items           : ' . DB::table('sale_items')->count());
            $this->command->info('  sale_item_packagings : ' . DB::table('sale_item_packagings')->count());
            $this->command->info('  sale_payments        : ' . DB::table('sale_payments')->count());
            $this->command->info('  sale_discounts       : ' . DB::table('sale_discounts')->count());
            $this->command->info('  discount_usages      : ' . DB::table('discount_usages')->count());
            $this->command->info('  stock_movements      : ' . DB::table('stock_movements')->where('movement_type','sale_out')->count());

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Seeding gagal: ' . $e->getMessage());
            $this->command->error($e->getTraceAsString());
            throw $e;
        }
    }

    // =========================================================================
    // LOAD MASTER DATA
    // =========================================================================
    private function loadMasterData(): void
    {
        $this->store1   = DB::table('stores')->where('code', 'STR001')->first();
        $this->store2   = DB::table('stores')->where('code', 'STR002')->first();
        $this->cashier1 = DB::table('users')->where('email', 'kasir.lamongan@gmail.com')->first()
                        ?? DB::table('users')->first();
        $this->cashier2 = DB::table('users')->where('email', 'kasir.gresik@gmail.com')->first()
                        ?? DB::table('users')->first();

        foreach (DB::table('variants')->where('is_active', true)->get() as $v) {
            $this->variants[$v->id] = $v;
        }
        foreach (DB::table('intensities')->where('is_active', true)->get() as $i) {
            $this->intensities[$i->code] = $i;
        }
        foreach (DB::table('sizes')->where('is_active', true)->get() as $s) {
            $this->sizes[$s->volume_ml] = $s;
        }

        // ✅ Index products [variant_id][intensity_id][size_id] => product
        foreach (DB::table('products')->where('is_active', true)->get() as $p) {
            $this->products[$p->variant_id][$p->intensity_id][$p->size_id] = $p;
        }

        $priceRows = DB::table('intensity_size_prices as isp')
            ->join('intensities as i', 'i.id', '=', 'isp.intensity_id')
            ->join('sizes as s',       's.id', '=', 'isp.size_id')
            ->where('isp.is_active', true)
            ->select('i.code as int_code', 's.volume_ml', 'isp.price', 'isp.intensity_id', 'isp.size_id')
            ->get();
        foreach ($priceRows as $p) {
            $this->prices[$p->int_code][$p->volume_ml] = [
                'price'        => (float) $p->price,
                'intensity_id' => $p->intensity_id,
                'size_id'      => $p->size_id,
            ];
        }

        $pkgs = DB::table('packaging_materials')
            ->where('is_active', true)
            ->where('is_available_as_addon', true)
            ->where('selling_price', '>', 0)
            ->get();
        foreach ($pkgs as $pkg) {
            $this->packagings[] = $pkg;
        }

        $this->customers = DB::table('customers')->where('is_active', true)->get()->all();

        foreach (DB::table('sales_people')->where('is_active', true)->get() as $sp) {
            $this->salesPeople[$sp->store_id][] = $sp;
        }
        foreach (DB::table('payment_methods')->where('is_active', true)->get() as $pm) {
            $this->payMethods[$pm->code] = $pm;
        }
        foreach (DB::table('discount_types')->where('is_active', true)->get() as $dt) {
            $this->discounts[$dt->code] = $dt;
        }
    }

    // =========================================================================
    // SEED SATU HARI
    // =========================================================================
    private function seedDay(string $date, ?object $store, int $count, array $promoFlags): void
    {
        if (! $store) return;
        $cashier = $store->code === 'STR001' ? $this->cashier1 : $this->cashier2;

        for ($i = 0; $i < $count; $i++) {
            $promo = null;
            if ($i === 0 && ! empty($promoFlags)) $promo = $promoFlags[0];
            if ($i === 1 && isset($promoFlags[1])) $promo = $promoFlags[1];
            $this->createSale($date, $store, $cashier, $promo);
        }
    }

    // =========================================================================
    // BUAT SATU TRANSAKSI
    // =========================================================================
    private function createSale(string $date, object $store, ?object $cashier, ?string $promo): void
    {
        $soldAt = $date . ' ' . str_pad(rand(9,20), 2, '0', STR_PAD_LEFT) . ':' . str_pad(rand(0,59), 2, '0', STR_PAD_LEFT) . ':00';

        $customer = (! empty($this->customers) && rand(1, 10) <= 6)
            ? $this->customers[array_rand($this->customers)]
            : null;

        $storeSps    = $this->salesPeople[$store->id] ?? [];
        $salesPerson = ! empty($storeSps) ? $storeSps[array_rand($storeSps)] : null;

        $items = $this->buildCartItems($promo);
        if (empty($items)) return;

        $subtotalPerfume   = array_sum(array_map(fn($i) => $i['unit_price'] * $i['qty'], $items));
        $packagingItems    = [];
        $subtotalPackaging = 0;

        if (rand(1, 10) <= 4 && ! empty($this->packagings)) {
            $pkg      = $this->packagings[array_rand($this->packagings)];
            $pkgPrice = (float) $pkg->selling_price;
            $pkgCost  = (float) ($pkg->average_cost ?? 0);
            $packagingItems[] = ['packaging_id' => $pkg->id, 'packaging_name' => $pkg->name, 'packaging_code' => $pkg->code, 'qty' => 1, 'unit_price' => $pkgPrice, 'subtotal' => $pkgPrice, 'unit_cost' => $pkgCost, 'cogs_total' => $pkgCost];
            $subtotalPackaging = $pkgPrice;
        }

        $subtotal        = $subtotalPerfume + $subtotalPackaging;
        [$discAmt, $dt]  = $promo ? $this->calculateDiscount($promo) : [0, null];
        $total           = max(0.0, $subtotal - $discAmt);
        $cogsPerfume     = array_sum(array_map(fn($i) => $i['cogs_per_unit'] * $i['qty'], $items));
        $cogsPackaging   = array_sum(array_map(fn($p) => $p['cogs_total'], $packagingItems));
        $cogsTotal       = $cogsPerfume + $cogsPackaging;
        $grossProfit     = $total - $cogsTotal;
        $grossMargin     = $total > 0 ? round(($grossProfit / $total) * 100, 2) : 0;
        $pointsEarned    = (int) floor($total / 1000);

        [$amtPaid, $change, $payRows] = $this->buildPayment($total);

        $this->saleCounter++;
        $saleId     = Str::uuid()->toString();
        $saleNumber = 'INV/' . str_replace('-', '', substr($date, 0, 10)) . '/' . str_pad($this->saleCounter, 5, '0', STR_PAD_LEFT);

        // ── SALES ─────────────────────────────────────────────────────────────
        DB::table('sales')->insert([
            'id'                      => $saleId,
            'sale_number'             => $saleNumber,
            'store_id'                => $store->id,
            'cashier_id'              => $cashier?->id,
            'cashier_name'            => $cashier?->name ?? 'Kasir',
            'sales_person_id'         => $salesPerson?->id,
            'sales_person_name'       => $salesPerson?->name,
            'customer_id'             => $customer?->id,
            'customer_name'           => $customer?->name ?? 'Pelanggan Umum',
            'sold_at'                 => $soldAt,
            'subtotal_perfume'        => $subtotalPerfume,
            'subtotal_packaging'      => $subtotalPackaging,
            'subtotal'                => $subtotal,
            'discount_amount'         => $discAmt,
            'tax_amount'              => 0.00,
            'total'                   => $total,
            'amount_paid'             => $amtPaid,
            'change_amount'           => $change,
            'cogs_perfume'            => $cogsPerfume,
            'cogs_packaging'          => $cogsPackaging,
            'cogs_total'              => $cogsTotal,
            'gross_profit'            => $grossProfit,
            'gross_margin_pct'        => $grossMargin,
            'points_earned'           => $pointsEarned,
            'points_redeemed'         => 0,
            'points_redemption_value' => 0.00,
            'status'                  => 'completed',
            'notes'                   => null,
            'cancellation_reason'     => null,
            'cancelled_at'            => null,
            'cancelled_by'            => null,
            'created_at'              => $soldAt,
            'updated_at'              => $soldAt,
        ]);

        // ── SALE ITEMS ────────────────────────────────────────────────────────
        foreach ($items as $idx => $item) {
            $saleItemId  = Str::uuid()->toString();
            $itemSub     = $item['unit_price'] * $item['qty'];
            $itemCogs    = $item['cogs_per_unit'] * $item['qty'];
            $itemProfit  = $itemSub - $itemCogs;
            $itemMargin  = $itemSub > 0 ? round(($itemProfit / $itemSub) * 100, 2) : 0;

            DB::table('sale_items')->insert([
                'id'                    => $saleItemId,
                'sale_id'               => $saleId,
                'product_id'            => $item['product_id'], // ✅ FK ke products
                'product_name'          => $item['product_name'],
                'product_sku'           => $item['sku'],
                'variant_name'          => $item['variant_name'],
                'intensity_code'        => $item['intensity_code'],
                'size_ml'               => $item['size_ml'],
                'variant_id_snapshot'   => $item['variant_id'],
                'intensity_id_snapshot' => $item['intensity_id'],
                'size_id_snapshot'      => $item['size_id'],
                'qty'                   => $item['qty'],
                'unit_price'            => $item['unit_price'],
                'item_discount'         => 0.00,
                'subtotal'              => $itemSub,
                'cogs_per_unit'         => $item['cogs_per_unit'],
                'cogs_total'            => $itemCogs,
                'line_gross_profit'     => $itemProfit,
                'line_gross_margin_pct' => $itemMargin,
                'notes'                 => null,
                'created_at'            => $soldAt,
                'updated_at'            => $soldAt,
            ]);

            // Packaging add-on untuk item pertama
            if ($idx === 0 && ! empty($packagingItems)) {
                foreach ($packagingItems as $pi) {
                    $pgProfit = $pi['subtotal'] - $pi['cogs_total'];
                    $pgMargin = $pi['subtotal'] > 0 ? round(($pgProfit / $pi['subtotal']) * 100, 2) : 0;
                    DB::table('sale_item_packagings')->insert([
                        'id'                    => Str::uuid(),
                        'sale_item_id'          => $saleItemId,
                        'packaging_material_id' => $pi['packaging_id'],
                        'packaging_name'        => $pi['packaging_name'],
                        'packaging_code'        => $pi['packaging_code'],
                        'qty'                   => 1,
                        'unit_price'            => $pi['unit_price'],
                        'subtotal'              => $pi['subtotal'],
                        'unit_cost'             => $pi['unit_cost'],
                        'cogs_total'            => $pi['cogs_total'],
                        'line_gross_profit'     => $pgProfit,
                        'line_gross_margin_pct' => $pgMargin,
                        'created_at'            => $soldAt,
                        'updated_at'            => $soldAt,
                    ]);
                }
            }

            $this->insertStockMovement($item, $store, $saleId, $saleNumber, $date, $soldAt, $cashier);
        }

        // ── SALE PAYMENTS ─────────────────────────────────────────────────────
        foreach ($payRows as $pay) {
            DB::table('sale_payments')->insert([
                'id'                  => Str::uuid(),
                'sale_id'             => $saleId,
                'payment_method_id'   => $pay['method_id'],
                'amount'              => $pay['amount'],
                'admin_fee'           => $pay['admin_fee'],
                'payment_method_name' => $pay['method_name'],
                'payment_method_type' => $pay['method_type'],
                'reference_number'    => $pay['ref'],
                'payment_status'      => 'completed',
                'settled_at'          => $soldAt,
                'notes'               => null,
                'created_at'          => $soldAt,
                'updated_at'          => $soldAt,
            ]);
        }

        // ── SALE DISCOUNTS + DISCOUNT USAGES ─────────────────────────────────
        if ($dt && $discAmt > 0) {
            $discCat = $dt->type === 'game_reward' ? 'game_reward' : 'buy_x_get_y';
            DB::table('sale_discounts')->insert([
                'id'                => Str::uuid(),
                'sale_id'           => $saleId,
                'discount_type_id'  => $dt->id,
                'discount_code'     => $dt->code,
                'discount_name'     => $dt->name,
                'discount_category' => $discCat,
                'discount_value'    => (float) $dt->value,
                'applied_amount'    => $discAmt,
                'sort_order'        => 1,
                'applied_to_items'  => json_encode([]),
                'reward_items'      => json_encode([]),
                'notes'             => null,
                'created_at'        => $soldAt,
                'updated_at'        => $soldAt,
            ]);
            DB::table('discount_usages')->insert([
                'id'                    => Str::uuid(),
                'discount_type_id'      => $dt->id,
                'order_id'              => $saleId,
                'store_id'              => $store->id,
                'customer_id'           => $customer?->id,
                'discount_amount'       => $discAmt,
                'original_amount'       => $subtotal,
                'final_amount'          => $total,
                'applied_to_items'      => json_encode([]),
                'reward_items'          => json_encode([]),
                'is_game_reward'        => $dt->type === 'game_reward',
                'game_type'             => $dt->type === 'game_reward' ? 'plinko' : null,
                'game_result'           => $dt->type === 'game_reward' ? 'Travel Size Parfum 10ml' : null,
                'chosen_reward_pool_id' => null,
                'used_at'               => $soldAt,
                'created_at'            => $soldAt,
                'updated_at'            => $soldAt,
            ]);
        }

        // ── CUSTOMER POINTS ───────────────────────────────────────────────────
        if ($customer && $pointsEarned > 0) {
            $newBal = (int) $customer->points + $pointsEarned;
            DB::table('customers')->where('id', $customer->id)->update([
                'points'                 => $newBal,
                'lifetime_points_earned' => DB::raw("lifetime_points_earned + {$pointsEarned}"),
                'lifetime_spending'      => DB::raw("lifetime_spending + {$total}"),
                'total_transactions'     => DB::raw('total_transactions + 1'),
                'updated_at'             => $soldAt,
            ]);
            DB::table('customer_point_ledgers')->insert([
                'id'             => Str::uuid(),
                'customer_id'    => $customer->id,
                'type'           => 'earned',
                'points'         => $pointsEarned,
                'balance_after'  => $newBal,
                'reference_type' => 'App\\Models\\Sale',
                'reference_id'   => $saleId,
                'notes'          => "Poin dari {$saleNumber}",
                'expired_at'     => null,
                'created_by'     => $cashier?->id,
                'created_at'     => $soldAt,
                'updated_at'     => $soldAt,
            ]);

            $idx = array_search($customer, $this->customers);
            if ($idx !== false) {
                $this->customers[$idx] = DB::table('customers')->find($customer->id);
            }
        }
    }

    // =========================================================================
    // BUILD CART ITEMS — menggunakan product_id dari tabel products
    // =========================================================================
    private function buildCartItems(?string $promo): array
    {
        $variantIds = array_keys($this->variants);
        if (empty($variantIds) || empty($this->products)) return [];

        return match ($promo) {
            'plinko' => $this->makeItems($variantIds, ['EDT','EDP','EXT'], [50], rand(2, 3)),
            'b1g1'   => $this->makeItems($variantIds, ['EDP','EXT'],      [50], 1),
            'b4g1'   => $this->makeItems($variantIds, ['EDT','EDP','EXT'], [50], 4),
            'b1g3'   => $this->makeItems($variantIds, ['EDP','EXT'],      [50], 1),
            default  => $this->makeItems($variantIds, ['EDT','EDP','EXT'], [30,50,100], rand(1, 3)),
        };
    }

    private function makeItems(array $variantIds, array $intCodes, array $volumes, int $count): array
    {
        $items = [];
        for ($i = 0; $i < $count; $i++) {
            $variantId = $variantIds[array_rand($variantIds)];
            $intCode   = $intCodes[array_rand($intCodes)];
            $volume    = $volumes[array_rand($volumes)];

            $variant   = $this->variants[$variantId] ?? null;
            $intensity = $this->intensities[$intCode] ?? null;
            $size      = $this->sizes[$volume] ?? null;
            if (! $variant || ! $intensity || ! $size) continue;

            $priceData = $this->prices[$intCode][$volume] ?? null;
            if (! $priceData) continue;

            // ✅ Ambil product_id dari tabel products
            $product = $this->products[$variantId][$intensity->id][$size->id] ?? null;
            if (! $product) continue;

            $items[] = [
                'product_id'     => $product->id,
                'product_name'   => $product->name,
                'sku'            => $product->sku,
                'variant_id'     => $variantId,
                'intensity_id'   => $intensity->id,
                'size_id'        => $size->id,
                'variant_name'   => $variant->name,
                'intensity_code' => $intCode,
                'size_ml'        => $volume,
                'qty'            => 1,
                'unit_price'     => $priceData['price'],
                'cogs_per_unit'  => $this->estimateCogs($intCode, $volume),
            ];
        }
        return $items;
    }

    private function estimateCogs(string $intCode, int $volume): float
    {
        $comp  = self::COMPOSITION[$intCode] ?? self::COMPOSITION['EDT'];
        $scale = $volume / 30;
        return round(
            ($comp['fragrance'] * 2000 + $comp['base'] * 450 + $comp['alc'] * 50 + $comp['add'] * 2000) * $scale, 2
        );
    }

    // =========================================================================
    // CALCULATE DISCOUNT
    // =========================================================================
    private function calculateDiscount(string $promo): array
    {
        $map = ['plinko'=>'PLINKO-P50','b1g1'=>'B1G1-P50-INTENSE','b4g1'=>'B4G1-P50-ALL','b1g3'=>'B1G3-P50-TRAVEL'];
        $dt  = $this->discounts[$map[$promo] ?? ''] ?? null;
        if (! $dt) return [0, null];

        $value = match ($promo) {
            'plinko' => 25000.00,
            'b1g1'   => $this->prices['EDT'][50]['price'] ?? 64000.00,
            'b4g1'   => $this->prices['EDT'][50]['price'] ?? 64000.00,
            'b1g3'   => ($this->prices['EDT'][30]['price'] ?? 46000.00) * 2,
            default  => 0,
        };
        return [$value, $dt];
    }

    // =========================================================================
    // BUILD PAYMENT
    // =========================================================================
    private function buildPayment(float $total): array
    {
        $rand = rand(1, 10);
        $rows = []; $paid = 0; $change = 0;

        if ($rand <= 4) {
            $pm   = $this->payMethods['CASH'] ?? null;
            $paid = ceil($total / 10000) * 10000;
            $rows[] = $this->payRow($pm, $paid, 0, null);
            $change = $paid - $total;
        } elseif ($rand <= 7) {
            $pm  = $this->payMethods['QRIS'] ?? null;
            $fee = round($total * 0.007, 2);
            $rows[] = $this->payRow($pm, $total, $fee, 'QR' . rand(100000,999999));
            $paid = $total;
        } elseif ($rand <= 9) {
            $codes  = ['TRF-BCA','TRF-MANDIRI','TRF-BRI'];
            $pm     = $this->payMethods[$codes[array_rand($codes)]] ?? null;
            $rows[] = $this->payRow($pm, $total, 0, 'TF' . rand(10000000,99999999));
            $paid   = $total;
        } else {
            $cashPart = floor($total * 0.5 / 50000) * 50000;
            $qrisPart = $total - $cashPart;
            $fee      = round($qrisPart * 0.007, 2);
            $rows[]   = $this->payRow($this->payMethods['CASH'] ?? null, $cashPart, 0, null);
            $rows[]   = $this->payRow($this->payMethods['QRIS'] ?? null, $qrisPart, $fee, 'QR'.rand(100000,999999));
            $paid = $total;
        }
        return [$paid, $change, $rows];
    }

    private function payRow(?object $pm, float $amount, float $fee, ?string $ref): array
    {
        return ['method_id'=>$pm?->id,'amount'=>$amount,'admin_fee'=>$fee,'method_name'=>$pm?->name??'Tunai','method_type'=>$pm?->type??'cash','ref'=>$ref];
    }

    // =========================================================================
    // STOCK MOVEMENT
    // =========================================================================
    private function insertStockMovement(array $item, object $store, string $saleId, string $saleNumber, string $date, string $soldAt, ?object $cashier): void
    {
        $alcIng = DB::table('ingredients')->where('code', 'ING-AL-001')->first();
        if (! $alcIng) return;

        $stock = DB::table('store_ingredient_stocks')
            ->where('store_id', $store->id)
            ->where('ingredient_id', $alcIng->id)
            ->first();
        if (! $stock || $stock->quantity <= 0) return;

        $deduct    = min((float) $item['size_ml'], (float) $stock->quantity);
        $qtyBefore = (float) $stock->quantity;
        $qtyAfter  = $qtyBefore - $deduct;

        DB::table('stock_movements')->insert([
            'id'               => Str::uuid(),
            'location_type'    => 'store',
            'location_id'      => $store->id,
            'item_type'        => 'ingredient',
            'item_id'          => $alcIng->id,
            'movement_type'    => 'sale_out',
            'qty_change'       => -$deduct,
            'qty_before'       => $qtyBefore,
            'qty_after'        => $qtyAfter,
            'unit_cost'        => (float) ($alcIng->average_cost ?? 50),
            'total_cost'       => round($deduct * (float) ($alcIng->average_cost ?? 50), 2),
            'avg_cost_before'  => (float) $stock->average_cost,
            'avg_cost_after'   => (float) $stock->average_cost,
            'reference_type'   => 'App\\Models\\Sale',
            'reference_id'     => $saleId,
            'reference_number' => $saleNumber,
            'movement_date'    => $date,
            'notes'            => 'POS — ' . $item['product_name'],
            'created_by'       => $cashier?->id,
            'created_at'       => $soldAt,
            'updated_at'       => $soldAt,
        ]);

        DB::table('store_ingredient_stocks')
            ->where('store_id', $store->id)
            ->where('ingredient_id', $alcIng->id)
            ->update(['quantity'=>$qtyAfter,'last_out_at'=>$soldAt,'last_out_qty'=>$deduct,'updated_at'=>$soldAt]);
    }

    // =========================================================================
    // SEED RETURN
    // =========================================================================
    private function seedReturn(): void
    {
        $sale = DB::table('sales')->where('status','completed')->where('store_id',$this->store1?->id)->orderBy('sold_at')->first();
        if (! $sale) return;
        $saleItem = DB::table('sale_items')->where('sale_id', $sale->id)->first();
        if (! $saleItem) return;

        $now     = now();
        $retId   = Str::uuid()->toString();
        $retNum  = 'RET/' . date('Ymd', strtotime($sale->sold_at)) . '/00001';
        $refund  = (float) $saleItem->unit_price;

        DB::table('sale_returns')->insert([
            'id'            => $retId,
            'return_number' => $retNum,
            'sale_id'       => $sale->id,
            'store_id'      => $sale->store_id,
            'cashier_id'    => $this->cashier1?->id,
            'returned_at'   => date('Y-m-d H:i:s', strtotime($sale->sold_at . ' +3 days')),
            'return_type'   => 'refund',
            'total_refund'  => $refund,
            'refund_method' => 'cash',
            'reason'        => 'Produk tidak sesuai dengan yang dipesan',
            'status'        => 'completed',
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);
        DB::table('sale_return_items')->insert([
            'id'             => Str::uuid(),
            'sale_return_id' => $retId,
            'sale_item_id'   => $saleItem->id,
            'qty_returned'   => 1,
            'refund_amount'  => $refund,
            'reason'         => 'Wangi tidak sesuai ekspektasi',
            'created_at'     => $now,
            'updated_at'     => $now,
        ]);
        DB::table('sales')->where('id', $sale->id)->update(['status'=>'refunded','updated_at'=>$now]);
        $this->command->info("Return seeded: {$retNum}");
    }
}
