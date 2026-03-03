<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Dashboard
            'dashboard-access',

            // Transactions / POS
            'transactions-access',
            'transactions-create',
            'transactions-void',
            'transactions-refund',

            // Products & Catalog
            'products-access',
            'products-create',
            'products-edit',
            'products-delete',

            // Variants
            'variants-access',
            'variants-create',
            'variants-edit',
            'variants-delete',

            // Recipes
            'recipes-access',
            'recipes-create',
            'recipes-edit',
            'recipes-delete',

            // Ingredients
            'ingredients-access',
            'ingredients-create',
            'ingredients-edit',
            'ingredients-delete',

            // Packaging
            'packaging-access',
            'packaging-create',
            'packaging-edit',
            'packaging-delete',

            // Suppliers
            'suppliers-access',
            'suppliers-create',
            'suppliers-edit',
            'suppliers-delete',

            // Purchases
            'purchases-access',
            'purchases-create',
            'purchases-edit',
            'purchases-approve',

            // Stock
            'stock-access',
            'stock-transfer',
            'stock-adjustment',
            'stock-repack',

            // Customers
            'customers-access',
            'customers-create',
            'customers-edit',

            // Discounts
            'discounts-access',
            'discounts-create',
            'discounts-edit',
            'discounts-delete',

            // Reports
            'reports-access',
            'reports-sales',
            'reports-stock',
            'reports-finance',

            // Settings
            'settings-access',
            'settings-stores',
            'settings-warehouses',
            'settings-users',
            'settings-roles',
            'settings-payment-methods',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // ── ROLES ──────────────────────────────────────────────────────────────

        // Super Admin — akses semua
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->syncPermissions(Permission::all());

        // Admin — hampir semua kecuali settings users & roles
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions(
            Permission::whereNotIn('name', ['settings-users', 'settings-roles'])->get()
        );

        // Manager Toko — operasional toko
        $manager = Role::firstOrCreate(['name' => 'store-manager']);
        $manager->syncPermissions([
            'dashboard-access',
            'transactions-access',
            'transactions-create',
            'transactions-void',
            'transactions-refund',
            'products-access',
            'variants-access',
            'ingredients-access',
            'packaging-access',
            'stock-access',
            'stock-transfer',
            'stock-adjustment',
            'customers-access',
            'customers-create',
            'customers-edit',
            'discounts-access',
            'reports-access',
            'reports-sales',
            'reports-stock',
            'purchases-access',
            'purchases-create',
        ]);

        // Kasir — hanya POS & customer
        $cashier = Role::firstOrCreate(['name' => 'cashier']);
        $cashier->syncPermissions([
            'dashboard-access',
            'transactions-access',
            'transactions-create',
            'products-access',
            'variants-access',
            'customers-access',
            'customers-create',
            'discounts-access',
            'stock-access',
        ]);

        // Gudang — stok & pembelian
        $warehouse = Role::firstOrCreate(['name' => 'warehouse-staff']);
        $warehouse->syncPermissions([
            'dashboard-access',
            'ingredients-access',
            'packaging-access',
            'stock-access',
            'stock-transfer',
            'stock-adjustment',
            'stock-repack',
            'purchases-access',
            'purchases-create',
            'suppliers-access',
            'reports-stock',
        ]);

        $this->command->info('Roles & Permissions seeded.');
    }
}
