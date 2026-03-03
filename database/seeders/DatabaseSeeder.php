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

            // 002 - Ingredients & Suppliers
            IngredientSupplierSeeder::class,

            // 003 - Packaging
            PackagingSeeder::class,

            // 004 - Variants, Intensities, Sizes
            IntensitySeeder::class,
            VariantSeeder::class,

            // 004b - Products (variant x intensity x size combinations)
            //        WAJIB sebelum SalesSeeder agar product_id valid
            // ProductSeeder::class,

            // 004c - Resep bahan baku per varian
            // VariantRecipeSeeder::class,

            // 004d - Store Categories
            StoreCategorySeeder::class,

            // 009 - Sales People
            SalesPeopleSeeder::class,

            // 010 - POS: Payment Methods, Customers
            PaymentMethodSeeder::class,
            CustomerSeeder::class,

            // 005 - Stock (after all master data)
            StockSeeder::class,

            // 006 - Purchases
            PurchaseSeeder::class,

            // 008 - Discounts
            DiscountSeeder::class,

            // 011 - Sales dummy data
            //       HARUS setelah ProductSeeder & DiscountSeeder
            SalesSeeder::class,
        ]);
    }
}
