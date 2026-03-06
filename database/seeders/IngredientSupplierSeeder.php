<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IngredientSupplierSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        /*
        |--------------------------------------------------------------------------
        | INGREDIENT CATEGORIES
        |--------------------------------------------------------------------------
        */
        $categories = [
            [
                'id'              => Str::uuid(),
                'code'            => 'IC-001',
                'name'            => 'Essential Oil',
                'ingredient_type' => 'oil',      // → oil_quantity
                'sort_order'      => 1,
            ],
            [
                'id'              => Str::uuid(),
                'code'            => 'IC-002',
                'name'            => 'Fragrance Oil',
                'ingredient_type' => 'oil',      // → oil_quantity
                'sort_order'      => 2,
            ],
            [
                'id'              => Str::uuid(),
                'code'            => 'IC-003',
                'name'            => 'Base Oil',
                'ingredient_type' => 'oil',      // → oil_quantity
                'sort_order'      => 3,
            ],
            [
                'id'              => Str::uuid(),
                'code'            => 'IC-004',
                'name'            => 'Alcohol',
                'ingredient_type' => 'alcohol',  // → alcohol_quantity
                'sort_order'      => 4,
            ],
            [
                'id'              => Str::uuid(),
                'code'            => 'IC-005',
                'name'            => 'Additive',
                'ingredient_type' => 'other',    // → other_quantity
                'sort_order'      => 5,
            ],
        ];

        foreach ($categories as $cat) {
            DB::table('ingredient_categories')->insert([
                'id'              => $cat['id'],
                'code'            => $cat['code'],
                'name'            => $cat['name'],
                'description'     => 'Category for ' . $cat['name'],
                'ingredient_type' => $cat['ingredient_type'],
                'is_active'       => true,
                'sort_order'      => $cat['sort_order'],
                'created_at'      => $now,
                'updated_at'      => $now,
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | SUPPLIERS
        |--------------------------------------------------------------------------
        */
        DB::table('suppliers')->insert([
            [
                'id'             => Str::uuid(),
                'code'           => 'SUP-001',
                'name'           => 'PT Aroma Nusantara',
                'contact_person' => 'Pak Budi',
                'phone'          => '021-11112222',
                'email'          => 'sales@aromanusantara.com',
                'address'        => 'Jl. Industri Aroma No. 10, Jakarta',
                // 'tax_id'         => '01.234.567.8-901.000', // Removed as it's not in your schema
                'payment_term'   => 'credit_30',
                'credit_limit'   => 50000000.00, // Ensure decimal format
                'is_active'      => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => Str::uuid(),
                'code'           => 'SUP-002',
                'name'           => 'CV Wangi Sejahtera',
                'contact_person' => 'Ibu Sari',
                'phone'          => '021-33334444',
                'email'          => 'order@wangisejahtera.com',
                'address'        => 'Jl. Fragrance No. 25, Tangerang',
                // 'tax_id'         => '02.345.678.9-012.000', // Removed as it's not in your schema
                'payment_term'   => 'credit_14',
                'credit_limit'   => 25000000.00, // Ensure decimal format
                'is_active'      => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => Str::uuid(),
                'code'           => 'SUP-003',
                'name'           => 'Toko Kimia Jaya',
                'contact_person' => 'Pak Herman',
                'phone'          => '021-55556666',
                'email'          => 'info@kimiajaya.com',
                'address'        => 'Jl. Kimia Raya No. 88, Bekasi',
                // 'tax_id'         => '03.456.789.0-123.000', // Removed as it's not in your schema
                'payment_term'   => 'cash',
                'credit_limit'   => 0.00, // Ensure decimal format
                'is_active'      => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | INGREDIENTS
        |--------------------------------------------------------------------------
        */
        $essentialOilCat = $categories[0]['id'];
        $fragranceCat    = $categories[1]['id'];
        $baseCat         = $categories[2]['id'];
        $alcoholCat      = $categories[3]['id'];
        $additiveCat     = $categories[4]['id'];

        $ingredients = [
            // Essential Oils
            [
                'ingredient_category_id' => $essentialOilCat,
                'code'                   => 'ING-EO-001',
                'name'                   => 'Lavender Essential Oil',
                'unit'                   => 'ml',
                'average_cost'           => 1500.0000,
            ],
            [
                'ingredient_category_id' => $essentialOilCat,
                'code'                   => 'ING-EO-002',
                'name'                   => 'Rose Essential Oil',
                'unit'                   => 'ml',
                'average_cost'           => 5000.0000,
            ],
            [
                'ingredient_category_id' => $essentialOilCat,
                'code'                   => 'ING-EO-003',
                'name'                   => 'Jasmine Essential Oil',
                'unit'                   => 'ml',
                'average_cost'           => 4500.0000,
            ],
            // Fragrance Oils
            [
                'ingredient_category_id' => $fragranceCat,
                'code'                   => 'ING-FO-001',
                'name'                   => 'Vanilla Fragrance Oil',
                'unit'                   => 'ml',
                'average_cost'           => 800.0000,
            ],
            [
                'ingredient_category_id' => $fragranceCat,
                'code'                   => 'ING-FO-002',
                'name'                   => 'Sandalwood Fragrance Oil',
                'unit'                   => 'ml',
                'average_cost'           => 1200.0000,
            ],
            // Base Oils
            [
                'ingredient_category_id' => $baseCat,
                'code'                   => 'ING-BO-001',
                'name'                   => 'Jojoba Oil',
                'unit'                   => 'ml',
                'average_cost'           => 500.0000,
            ],
            [
                'ingredient_category_id' => $baseCat,
                'code'                   => 'ING-BO-002',
                'name'                   => 'Sweet Almond Oil',
                'unit'                   => 'ml',
                'average_cost'           => 400.0000,
            ],
            // Alcohol
            [
                'ingredient_category_id' => $alcoholCat,
                'code'                   => 'ING-AL-001',
                'name'                   => 'Ethanol 96%',
                'unit'                   => 'ml',
                'average_cost'           => 50.0000,
            ],
            [
                'ingredient_category_id' => $alcoholCat,
                'code'                   => 'ING-AL-002',
                'name'                   => 'Dipropylene Glycol (DPG)',
                'unit'                   => 'ml',
                'average_cost'           => 150.0000,
            ],
            // Additives
            [
                'ingredient_category_id' => $additiveCat,
                'code'                   => 'ING-ADD-001',
                'name'                   => 'Vitamin E Oil',
                'unit'                   => 'ml',
                'average_cost'           => 2000.0000,
            ],
            [
                'ingredient_category_id' => $additiveCat,
                'code'                   => 'ING-ADD-002',
                'name'                   => 'Fixative Powder',
                'unit'                   => 'gr',
                'average_cost'           => 300.0000,
            ],
        ];

        foreach ($ingredients as $index => $ing) {
            DB::table('ingredients')->insert([
                'id'                     => Str::uuid(),
                'ingredient_category_id' => $ing['ingredient_category_id'],
                'code'                   => $ing['code'],
                'name'                   => $ing['name'],
                'unit'                   => $ing['unit'],
                'description'            => 'Standard ' . $ing['name'],
                'average_cost'           => $ing['average_cost'],
                'is_active'              => true,
                'sort_order'             => $index + 1,
                'created_at'             => $now,
                'updated_at'             => $now,
            ]);
        }
    }
}
