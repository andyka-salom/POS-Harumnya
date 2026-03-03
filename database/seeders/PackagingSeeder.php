<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PackagingSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        /*
        |--------------------------------------------------------------------------
        | PACKAGING CATEGORIES
        |--------------------------------------------------------------------------
        */
        $categories = [
            ['id' => Str::uuid(), 'code' => 'PC-001', 'name' => 'Botol', 'sort_order' => 1],
            ['id' => Str::uuid(), 'code' => 'PC-002', 'name' => 'Tutup', 'sort_order' => 2],
            ['id' => Str::uuid(), 'code' => 'PC-003', 'name' => 'Paper Bag', 'sort_order' => 3],
            ['id' => Str::uuid(), 'code' => 'PC-004', 'name' => 'Gift Card', 'sort_order' => 4],
        ];

        foreach ($categories as $cat) {
            DB::table('packaging_categories')->insert([
                'id' => $cat['id'],
                'code' => $cat['code'],
                'name' => $cat['name'],
                'description' => "Kategori untuk packaging " . $cat['name'],
                'is_active' => true,
                'sort_order' => $cat['sort_order'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | PACKAGING MATERIALS
        |--------------------------------------------------------------------------
        */
        $botolCat = $categories[0]['id'];
        $tutupCat = $categories[1]['id'];
        $paperBagCat = $categories[2]['id'];
        $giftCardCat = $categories[3]['id'];

        $materials = [
            // Botol
            [
                'packaging_category_id' => $botolCat,
                'code' => 'PKG-BOT-30',
                'name' => 'Botol Spray 30ml - Kaca Bening',
                'purchase_price' => 8000,
                'selling_price' => 0,
                'is_available_as_addon' => false,
                'sort_order' => 1,
            ],
            [
                'packaging_category_id' => $botolCat,
                'code' => 'PKG-BOT-50',
                'name' => 'Botol Spray 50ml - Kaca Bening',
                'purchase_price' => 10000,
                'selling_price' => 0,
                'is_available_as_addon' => false,
                'sort_order' => 2,
            ],
            [
                'packaging_category_id' => $botolCat,
                'code' => 'PKG-BOT-100',
                'name' => 'Botol Spray 100ml - Kaca Bening',
                'purchase_price' => 15000,
                'selling_price' => 0,
                'is_available_as_addon' => false,
                'sort_order' => 3,
            ],

            // Tutup
            [
                'packaging_category_id' => $tutupCat,
                'code' => 'PKG-TTP-30',
                'name' => 'Tutup Spray 30ml - Hitam',
                'purchase_price' => 2000,
                'selling_price' => 0,
                'is_available_as_addon' => false,
                'sort_order' => 1,
            ],
            [
                'packaging_category_id' => $tutupCat,
                'code' => 'PKG-TTP-50',
                'name' => 'Tutup Spray 50ml - Hitam',
                'purchase_price' => 2500,
                'selling_price' => 0,
                'is_available_as_addon' => false,
                'sort_order' => 2,
            ],

            // Paper Bag (As Add-on)
            [
                'packaging_category_id' => $paperBagCat,
                'code' => 'PKG-PB-S',
                'name' => 'Paper Bag Small - Premium',
                'purchase_price' => 3000,
                'selling_price' => 5000,
                'is_available_as_addon' => true,
                'sort_order' => 1,
            ],
            [
                'packaging_category_id' => $paperBagCat,
                'code' => 'PKG-PB-M',
                'name' => 'Paper Bag Medium - Premium',
                'purchase_price' => 5000,
                'selling_price' => 8000,
                'is_available_as_addon' => true,
                'sort_order' => 2,
            ],

            // Gift Card (As Add-on)
            [
                'packaging_category_id' => $giftCardCat,
                'code' => 'PKG-GC-STD',
                'name' => 'Gift Card Standard',
                'purchase_price' => 2000,
                'selling_price' => 5000,
                'is_available_as_addon' => true,
                'sort_order' => 1,
            ],
            [
                'packaging_category_id' => $giftCardCat,
                'code' => 'PKG-GC-PRM',
                'name' => 'Gift Card Premium - Embossed',
                'purchase_price' => 5000,
                'selling_price' => 10000,
                'is_available_as_addon' => true,
                'sort_order' => 2,
            ],
        ];

        foreach ($materials as $item) {
            DB::table('packaging_materials')->insert([
                'id' => Str::uuid(),
                'packaging_category_id' => $item['packaging_category_id'],
                'unit' => 'pcs',
                'code' => $item['code'],
                'name' => $item['name'],
                'size_id' => null, // Opsional jika ada tabel sizes
                'image' => null,
                'description' => 'Deskripsi untuk ' . $item['name'],
                'is_available_as_addon' => $item['is_available_as_addon'],
                'purchase_price' => $item['purchase_price'],
                'selling_price' => $item['selling_price'],
                'average_cost' => $item['purchase_price'], // Initial average cost disamakan dengan purchase price
                'is_active' => true,
                'sort_order' => $item['sort_order'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
