<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SalesPeopleSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $store1 = DB::table('stores')->where('code', 'STR001')->first();
        $store2 = DB::table('stores')->where('code', 'STR002')->first();

        if (! $store1 || ! $store2) {
            $this->command->error('Stores belum ada. Jalankan WarehouseStoreSeeder terlebih dahulu.');
            return;
        }

        $salesPeople = [
            // Toko Lamongan
            [
                'store_id'   => $store1->id,
                'code'       => 'SP-LAM-001',
                'name'       => 'Dewi Rahayu',
                'phone'      => '08111234561',
                'email'      => 'dewi.rahayu@parfum.com',
                'join_date'  => '2023-01-15',
            ],
            [
                'store_id'   => $store1->id,
                'code'       => 'SP-LAM-002',
                'name'       => 'Rina Susanti',
                'phone'      => '08111234562',
                'email'      => 'rina.susanti@parfum.com',
                'join_date'  => '2023-03-01',
            ],
            [
                'store_id'   => $store1->id,
                'code'       => 'SP-LAM-003',
                'name'       => 'Agus Prasetyo',
                'phone'      => '08111234563',
                'email'      => 'agus.prasetyo@parfum.com',
                'join_date'  => '2023-06-10',
            ],

            // Toko Gresik
            [
                'store_id'   => $store2->id,
                'code'       => 'SP-GRE-001',
                'name'       => 'Fitria Handayani',
                'phone'      => '08111234564',
                'email'      => 'fitria.handayani@parfum.com',
                'join_date'  => '2023-02-01',
            ],
            [
                'store_id'   => $store2->id,
                'code'       => 'SP-GRE-002',
                'name'       => 'Budi Kurniawan',
                'phone'      => '08111234565',
                'email'      => 'budi.kurniawan@parfum.com',
                'join_date'  => '2023-04-15',
            ],
            [
                'store_id'   => $store2->id,
                'code'       => 'SP-GRE-003',
                'name'       => 'Lestari Wulandari',
                'phone'      => '08111234566',
                'email'      => 'lestari.wulandari@parfum.com',
                'join_date'  => '2023-07-01',
            ],
        ];

        foreach ($salesPeople as $sp) {
            $spId = Str::uuid()->toString();

            DB::table('sales_people')->insert([
                'id'         => $spId,
                'store_id'   => $sp['store_id'],
                'code'       => $sp['code'],
                'name'       => $sp['name'],
                'phone'      => $sp['phone'],
                'email'      => $sp['email'],
                'join_date'  => $sp['join_date'],
                'is_active'  => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Sales targets per bulan (tahun 2025)
            $targets = [
                ['month' => 1,  'amount' => 8000000,  'qty' => 80],
                ['month' => 2,  'amount' => 8500000,  'qty' => 85],
                ['month' => 3,  'amount' => 9000000,  'qty' => 90],
                ['month' => 4,  'amount' => 9000000,  'qty' => 90],
                ['month' => 5,  'amount' => 10000000, 'qty' => 100],
                ['month' => 6,  'amount' => 12000000, 'qty' => 120],
                ['month' => 7,  'amount' => 10000000, 'qty' => 100],
                ['month' => 8,  'amount' => 10000000, 'qty' => 100],
                ['month' => 9,  'amount' => 9000000,  'qty' => 90],
                ['month' => 10, 'amount' => 9000000,  'qty' => 90],
                ['month' => 11, 'amount' => 11000000, 'qty' => 110],
                ['month' => 12, 'amount' => 15000000, 'qty' => 150],
            ];

            foreach ($targets as $t) {
                DB::table('sales_targets')->insert([
                    'id'              => Str::uuid(),
                    'sales_person_id' => $spId,
                    'year'            => 2025,
                    'month'           => $t['month'],
                    'target_amount'   => $t['amount'],
                    'target_quantity' => $t['qty'],
                    'created_at'      => $now,
                    'updated_at'      => $now,
                ]);
            }
        }

        $this->command->info('Sales people & targets seeded (' . count($salesPeople) . ' people).');
    }
}
