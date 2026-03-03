<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // --- 1. Master Data Roles (Role per Modul) ---
        $this->createRoleWithPermissions('users-access', '%users%');
        $this->createRoleWithPermissions('roles-access', '%roles%');
        $this->createRoleWithPermissions('permissions-access', '%permissions%');
        $this->createRoleWithPermissions('categories-access', '%categories%');
        $this->createRoleWithPermissions('products-access', '%products%');
        $this->createRoleWithPermissions('variants-access', '%variants%');
        $this->createRoleWithPermissions('intensities-access', '%intensities%');
        $this->createRoleWithPermissions('sizes-access', '%sizes%');

        // --- 2. Inventory & Production Roles ---
        $this->createRoleWithPermissions('ingredient-categories-access', '%ingredient-categories%');
        $this->createRoleWithPermissions('ingredients-access', '%ingredients%');
        $this->createRoleWithPermissions('recipes-access', '%recipes%');
        $this->createRoleWithPermissions('intensity-size-prices-access', '%intensity-size-prices%');
        $this->createRoleWithPermissions('warehouses-access', '%warehouses%');
        $this->createRoleWithPermissions('stores-access', '%stores%');
        $this->createRoleWithPermissions('warehouse-stocks-access', '%warehouse-stocks%');
        $this->createRoleWithPermissions('store-stocks-access', '%store-stocks%');
        $this->createRoleWithPermissions('repack-access', '%repack%');
        $this->createRoleWithPermissions('stock-movements-access', '%stock-movements%');
        $this->createRoleWithPermissions('packaging-access', '%packaging%');

        // --- 3. Sales & Reports Roles ---
        $this->createRoleWithPermissions('customers-access', '%customers%');
        $this->createRoleWithPermissions('sales-people-access', '%sales-people%');
        $this->createRoleWithPermissions('discounts-access', '%discounts%');
        $this->createRoleWithPermissions('transactions-access', '%transactions%');
        $this->createRoleWithPermissions('reports-access', '%reports%');
        $this->createRoleWithPermissions('profits-access', '%profits%');
        $this->createRoleWithPermissions('payment-settings-access', '%payment-settings%');

        // --- 4. Super Admin (Mendapatkan semua permission) ---
        $superAdmin = Role::create(['name' => 'super-admin']);
        $allPermissions = Permission::all();
        $superAdmin->givePermissionTo($allPermissions);

        // --- 5. Cashier Role (Akses Terbatas) ---
        $cashierRole = Role::create(['name' => 'cashier']);
        $cashierPermissions = Permission::whereIn('name', [
            'dashboard-access',
            'transactions-access',
            'customers-access',
            'customers-create',
            'store-stocks-access', // Ditambahkan agar kasir bisa lihat stok toko
        ])->get();
        $cashierRole->givePermissionTo($cashierPermissions);

        // --- 6. Warehouse Staff (Contoh Role Tambahan) ---
        $warehouseStaff = Role::create(['name' => 'warehouse-staff']);
        $warehousePermissions = Permission::where('name', 'like', '%warehouses%')
            ->orWhere('name', 'like', '%ingredients%')
            ->orWhere('name', 'like', '%repack%')
            ->orWhere('name', 'like', '%stock-movements%')
            ->get();
        $warehouseStaff->givePermissionTo($warehousePermissions);
    }

    /**
     * Helper untuk membuat role berdasarkan pattern nama permission
     */
    private function createRoleWithPermissions($roleName, $permissionNamePattern)
    {
        // Cari permission yang sesuai pattern
        $permissions = Permission::where('name', 'like', $permissionNamePattern)->get();

        // Buat role (gunakan firstOrCreate agar tidak error jika dijalankan ulang)
        $role = Role::firstOrCreate(['name' => $roleName]);

        // Tambahkan dashboard-access secara default untuk setiap role modul agar bisa login
        $dashboardPermission = Permission::where('name', 'dashboard-access')->first();
        if ($dashboardPermission) {
            $role->givePermissionTo($dashboardPermission);
        }

        $role->syncPermissions($permissions); // syncPermissions lebih aman daripada givePermissionTo
    }
}
