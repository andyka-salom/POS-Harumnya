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

        // ── PERMISSIONS ────────────────────────────────────────────────────────

        $permissions = [

            // ── Dashboard ────────────────────────────────────────────────────
            'dashboard-access',

            // ── Transactions / POS ───────────────────────────────────────────
            'transactions-access',
            'transactions-create',
            'transactions-void',
            'transactions-refund',

            // ── Products & Catalog ───────────────────────────────────────────
            'products-access',
            'products-create',
            'products-edit',
            'products-delete',

            // ── Variants ─────────────────────────────────────────────────────
            'variants-access',
            'variants-create',
            'variants-edit',
            'variants-delete',

            // ── Intensities ──────────────────────────────────────────────────
            'intensities-access',
            'intensities-create',
            'intensities-edit',
            'intensities-delete',

            // ── Sizes ────────────────────────────────────────────────────────
            'sizes-access',
            'sizes-create',
            'sizes-edit',
            'sizes-delete',

            // ── Categories ───────────────────────────────────────────────────
            'categories-access',
            'categories-create',
            'categories-edit',
            'categories-delete',

            // ── Recipes ──────────────────────────────────────────────────────
            'recipes-access',
            'recipes-create',
            'recipes-edit',
            'recipes-delete',

            // ── Ingredients (Bahan Baku) ──────────────────────────────────────
            'ingredients-access',
            'ingredients-create',
            'ingredients-edit',
            'ingredients-delete',

            // ── Packaging (Kemasan) ──────────────────────────────────────────
            'packaging-access',
            'packaging-create',
            'packaging-edit',
            'packaging-delete',

            // ── Suppliers ────────────────────────────────────────────────────
            'suppliers-access',
            'suppliers-create',
            'suppliers-edit',
            'suppliers-delete',

            // ── Warehouses ───────────────────────────────────────────────────
            'warehouses-access',
            'warehouses-create',
            'warehouses-edit',
            'warehouses-delete',

            // ── Stores ───────────────────────────────────────────────────────
            'stores-access',
            'stores-create',
            'stores-edit',
            'stores-delete',

            // ── Store Categories ─────────────────────────────────────────────
            'store-categories-access',
            'store-categories-create',
            'store-categories-edit',
            'store-categories-delete',

            // ── Purchases ────────────────────────────────────────────────────
            'purchases-access',
            'purchases-create',
            'purchases-edit',
            'purchases-approve',

            // ── Stock Management ─────────────────────────────────────────────
            'stock-access',
            'stock-transfer',
            'stock-adjustment',
            'stock-repack',

            // ── Customers ────────────────────────────────────────────────────
            'customers-access',
            'customers-create',
            'customers-edit',
            'customers-delete',

            // ── Sales People ─────────────────────────────────────────────────
            'sales-people-access',
            'sales-people-create',
            'sales-people-edit',
            'sales-people-delete',

            // ── Discounts (Promo) ─────────────────────────────────────────────
            'discounts-access',
            'discounts-create',
            'discounts-edit',
            'discounts-delete',

            // ── Payment Methods ───────────────────────────────────────────────
            'payment-methods-access',
            'payment-methods-create',
            'payment-methods-edit',
            'payment-methods-delete',

            // ── Payment Settings ─────────────────────────────────────────────
            'payment-settings-access',

            // ── Reports ───────────────────────────────────────────────────────
            //   reports-access  → Laporan Penjualan (route: permission:reports-access)
            //   profits-access  → Laporan Keuangan  (route: permission:profits-access)
            'reports-access',
            'reports-sales',
            'reports-stock',
            'reports-finance',
            'profits-access',

            // ── Users ─────────────────────────────────────────────────────────
            'users-access',
            'users-create',
            'users-update',
            'users-delete',

            // ── Roles ─────────────────────────────────────────────────────────
            'roles-access',
            'roles-create',
            'roles-update',
            'roles-delete',

            // ── Permissions ───────────────────────────────────────────────────
            'permissions-access',

            // ── Settings (general) ────────────────────────────────────────────
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

        // ── Super Admin — akses semua ─────────────────────────────────────────
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->syncPermissions(Permission::all());

        // ── Admin — semua permissions (sama dengan super-admin) ───────────────
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions(Permission::all());

        // ── Manager Toko — operasional toko ───────────────────────────────────
        $manager = Role::firstOrCreate(['name' => 'store-manager']);
        $manager->syncPermissions([
            'dashboard-access',

            // POS & Transaksi
            'transactions-access',
            'transactions-create',
            'transactions-void',
            'transactions-refund',

            // Produk & Katalog (read only)
            'products-access',
            'variants-access',
            'intensities-access',
            'sizes-access',
            'categories-access',
            'recipes-access',
            'ingredients-access',
            'packaging-access',

            // Stok
            'stock-access',
            'stock-transfer',
            'stock-adjustment',

            // Pembelian
            'purchases-access',
            'purchases-create',

            // Pelanggan
            'customers-access',
            'customers-create',
            'customers-edit',

            // Sales People
            'sales-people-access',

            // Diskon
            'discounts-access',

            // Laporan Penjualan
            'reports-access',
            'reports-sales',
            'reports-stock',

            // Laporan Keuangan
            'profits-access',
        ]);

        // ── Kasir — hanya POS & pelanggan ────────────────────────────────────
        $cashier = Role::firstOrCreate(['name' => 'cashier']);
        $cashier->syncPermissions([
            'dashboard-access',

            // POS
            'transactions-access',
            'transactions-create',

            // Katalog (read only)
            'products-access',
            'variants-access',
            'intensities-access',
            'sizes-access',
            'packaging-access',

            // Pelanggan
            'customers-access',
            'customers-create',

            // Diskon (lihat saja)
            'discounts-access',

            // Stok (lihat saja)
            'stock-access',
        ]);

        // ── Gudang — stok & pembelian ─────────────────────────────────────────
        $warehouse = Role::firstOrCreate(['name' => 'warehouse-staff']);
        $warehouse->syncPermissions([
            'dashboard-access',

            // Bahan Baku & Kemasan
            'ingredients-access',
            'ingredients-create',
            'ingredients-edit',
            'packaging-access',
            'packaging-create',
            'packaging-edit',

            // Stok
            'stock-access',
            'stock-transfer',
            'stock-adjustment',
            'stock-repack',

            // Pembelian
            'purchases-access',
            'purchases-create',

            // Supplier
            'suppliers-access',

            // Laporan stok
            'reports-stock',
        ]);

        // ── Finance / Akuntan — laporan keuangan ─────────────────────────────
        $finance = Role::firstOrCreate(['name' => 'finance']);
        $finance->syncPermissions([
            'dashboard-access',

            // Laporan Penjualan & Keuangan
            'reports-access',
            'reports-sales',
            'reports-finance',
            'profits-access',

            // Bisa lihat customer & transaksi (read only)
            'transactions-access',
            'customers-access',
            'discounts-access',

            // Lihat toko & gudang
            'stores-access',
            'warehouses-access',
        ]);

        $this->command->info('✓ Roles & Permissions seeded successfully.');
        $this->command->table(
            ['Role', 'Jumlah Permission'],
            [
                ['super-admin',      $superAdmin->permissions()->count()],
                ['admin',            $admin->permissions()->count()],
                ['store-manager',    $manager->permissions()->count()],
                ['cashier',          $cashier->permissions()->count()],
                ['warehouse-staff',  $warehouse->permissions()->count()],
                ['finance',          $finance->permissions()->count()],
            ]
        );
    }
}
