<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Dashboard & System Permissions
        Permission::create(['name' => 'dashboard-access']);

        // Users
        Permission::create(['name' => 'users-access']);
        Permission::create(['name' => 'users-create']);
        Permission::create(['name' => 'users-update']);
        Permission::create(['name' => 'users-delete']);

        // Roles
        Permission::create(['name' => 'roles-access']);
        Permission::create(['name' => 'roles-create']);
        Permission::create(['name' => 'roles-update']);
        Permission::create(['name' => 'roles-delete']);

        // Permissions
        Permission::create(['name' => 'permissions-access']);
        // (Create, Update, Delete permission biasanya jarang diberikan ke user, tapi bisa ditambah jika perlu)

        // 2. Master Data Permissions (Products & Categories)
        Permission::create(['name' => 'categories-access']);
        Permission::create(['name' => 'categories-create']);
        Permission::create(['name' => 'categories-edit']);
        Permission::create(['name' => 'categories-delete']);

        Permission::create(['name' => 'products-access']);
        Permission::create(['name' => 'products-create']);
        Permission::create(['name' => 'products-edit']);
        Permission::create(['name' => 'products-delete']);

        // Variants
        Permission::create(['name' => 'variants-access']);
        Permission::create(['name' => 'variants-create']);
        Permission::create(['name' => 'variants-update']);
        Permission::create(['name' => 'variants-delete']);

        // Intensities
        Permission::create(['name' => 'intensities-access']);
        Permission::create(['name' => 'intensities-create']);
        Permission::create(['name' => 'intensities-update']);
        Permission::create(['name' => 'intensities-delete']);

        // Sizes
        Permission::create(['name' => 'sizes-access']);
        Permission::create(['name' => 'sizes-create']);
        Permission::create(['name' => 'sizes-update']);
        Permission::create(['name' => 'sizes-delete']);

        // 3. Ingredient & Recipe Permissions
        Permission::create(['name' => 'ingredient-categories-access']);
        Permission::create(['name' => 'ingredient-categories-create']);
        Permission::create(['name' => 'ingredient-categories-update']);
        Permission::create(['name' => 'ingredient-categories-delete']);

        Permission::create(['name' => 'ingredients-access']);
        Permission::create(['name' => 'ingredients-create']);
        Permission::create(['name' => 'ingredients-update']);
        Permission::create(['name' => 'ingredients-delete']);

        Permission::create(['name' => 'recipes-access']);
        Permission::create(['name' => 'recipes-create']);
        Permission::create(['name' => 'recipes-update']);
        Permission::create(['name' => 'recipes-delete']);

        Permission::create(['name' => 'intensity-size-prices-access']);
        Permission::create(['name' => 'intensity-size-prices-create']);
        Permission::create(['name' => 'intensity-size-prices-update']);
        Permission::create(['name' => 'intensity-size-prices-delete']);

        // 4. Inventory & Warehouse Permissions
        Permission::create(['name' => 'warehouses-access']);
        Permission::create(['name' => 'warehouses-create']);
        Permission::create(['name' => 'warehouses-update']);
        Permission::create(['name' => 'warehouses-delete']);

        Permission::create(['name' => 'stores-access']);
        Permission::create(['name' => 'stores-create']);
        Permission::create(['name' => 'stores-update']);
        Permission::create(['name' => 'stores-delete']);

        Permission::create(['name' => 'warehouse-stocks-access']);
        Permission::create(['name' => 'warehouse-stocks-create']);
        Permission::create(['name' => 'warehouse-stocks-update']);
        Permission::create(['name' => 'warehouse-stocks-delete']);

        Permission::create(['name' => 'store-stocks-access']);
        Permission::create(['name' => 'store-stocks-create']);
        Permission::create(['name' => 'store-stocks-update']);
        Permission::create(['name' => 'store-stocks-delete']);

        Permission::create(['name' => 'repack-access']);
        Permission::create(['name' => 'repack-create']);
        Permission::create(['name' => 'repack-delete']);

        Permission::create(['name' => 'stock-movements-access']);
        Permission::create(['name' => 'stock-movements-create']);

        Permission::create(['name' => 'packaging-access']);
        Permission::create(['name' => 'packaging-create']);
        Permission::create(['name' => 'packaging-update']);
        Permission::create(['name' => 'packaging-delete']);

        // 5. Sales & Marketing Permissions
        Permission::create(['name' => 'customers-access']);
        Permission::create(['name' => 'customers-create']);
        Permission::create(['name' => 'customers-edit']);
        Permission::create(['name' => 'customers-delete']);

        Permission::create(['name' => 'sales-people-access']);
        Permission::create(['name' => 'sales-people-create']);
        Permission::create(['name' => 'sales-people-update']);
        Permission::create(['name' => 'sales-people-delete']);

        Permission::create(['name' => 'discounts-access']);
        Permission::create(['name' => 'discounts-create']);
        Permission::create(['name' => 'discounts-update']);
        Permission::create(['name' => 'discounts-delete']);

        Permission::create(['name' => 'transactions-access']);

        // 6. Reports & Settings Permissions
        Permission::create(['name' => 'reports-access']); // Sales Report
        Permission::create(['name' => 'profits-access']); // Profit Report
        Permission::create(['name' => 'payment-settings-access']);
    }
}
