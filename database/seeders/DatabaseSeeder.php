<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // 000 - Base: Warehouses & Stores
            WarehouseStoreSeeder::class,

            // 001 - Users & Roles
            RolePermissionSeeder::class,
            UserSeeder::class,
            IntensitySeeder::class,
            IngredientSupplierSeeder::class,
            PackagingSeeder::class,
            IntensitySeeder::class,
            VariantSeeder::class,
            StoreCategorySeeder::class,
            SalesPeopleSeeder::class,
            PaymentMethodSeeder::class,
            DiscountSeeder::class,
        ]);
    }
}
