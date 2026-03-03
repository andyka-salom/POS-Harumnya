<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // Ambil store & warehouse untuk default assignment
        $warehouse = DB::table('warehouses')->where('code', 'WH001')->first();
        $store1    = DB::table('stores')->where('code', 'STR001')->first();
        $store2    = DB::table('stores')->where('code', 'STR002')->first();

        $whId = $warehouse?->id;
        $s1Id = $store1?->id;
        $s2Id = $store2?->id;

        $users = [
            [
                'name'                  => 'Super Admin',
                'email'                 => 'superadmin@gmail.com',
                'password'              => bcrypt('password'),
                'default_warehouse_id'  => $whId,
                'default_store_id'      => null,
                'role'                  => 'super-admin',
            ],
            [
                'name'                  => 'Admin',
                'email'                 => 'admin@gmail.com',
                'password'              => bcrypt('password'),
                'default_warehouse_id'  => $whId,
                'default_store_id'      => null,
                'role'                  => 'admin',
            ],
            [
                'name'                  => 'Manager Lamongan',
                'email'                 => 'manager.lamongan@gmail.com',
                'password'              => bcrypt('password'),
                'default_warehouse_id'  => null,
                'default_store_id'      => $s1Id,
                'role'                  => 'store-manager',
            ],
            [
                'name'                  => 'Manager Gresik',
                'email'                 => 'manager.gresik@gmail.com',
                'password'              => bcrypt('password'),
                'default_warehouse_id'  => null,
                'default_store_id'      => $s2Id,
                'role'                  => 'store-manager',
            ],
            [
                'name'                  => 'Kasir Lamongan',
                'email'                 => 'kasir.lamongan@gmail.com',
                'password'              => bcrypt('password'),
                'default_warehouse_id'  => null,
                'default_store_id'      => $s1Id,
                'role'                  => 'cashier',
            ],
            [
                'name'                  => 'Kasir Gresik',
                'email'                 => 'kasir.gresik@gmail.com',
                'password'              => bcrypt('password'),
                'default_warehouse_id'  => null,
                'default_store_id'      => $s2Id,
                'role'                  => 'cashier',
            ],
            [
                'name'                  => 'Staff Gudang',
                'email'                 => 'gudang@gmail.com',
                'password'              => bcrypt('password'),
                'default_warehouse_id'  => $whId,
                'default_store_id'      => null,
                'role'                  => 'warehouse-staff',
            ],
        ];

        foreach ($users as $u) {
            $user = User::create([
                'name'                 => $u['name'],
                'email'                => $u['email'],
                'password'             => $u['password'],
                'default_warehouse_id' => $u['default_warehouse_id'],
                'default_store_id'     => $u['default_store_id'],
            ]);

            $role = Role::where('name', $u['role'])->first();
            if ($role) {
                $user->assignRole($role);
            }
        }

        $this->command->info('Users seeded (' . count($users) . ' users).');
    }
}
