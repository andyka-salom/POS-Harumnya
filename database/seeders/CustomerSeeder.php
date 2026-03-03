<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $customers = [
            // Platinum
            [
                'code'               => 'CST-00001',
                'name'               => 'Sari Dewi Kusuma',
                'phone'              => '08123456001',
                'email'              => 'sari.dewi@email.com',
                'address'            => 'Jl. Mawar No. 5, Lamongan',
                'birth_date'         => '1990-03-15',
                'gender'             => 'female',
                'points'             => 4500,
                'lifetime_points_earned' => 12000,
                'lifetime_spending'  => 5850000.00,
                'total_transactions' => 42,
                'tier'               => 'platinum',
                'registered_at'      => '2022-01-10 10:00:00',
            ],
            [
                'code'               => 'CST-00002',
                'name'               => 'Hendro Wijaya',
                'phone'              => '08123456002',
                'email'              => 'hendro.w@email.com',
                'address'            => 'Jl. Melati No. 12, Gresik',
                'birth_date'         => '1985-07-22',
                'gender'             => 'male',
                'points'             => 3200,
                'lifetime_points_earned' => 9500,
                'lifetime_spending'  => 4250000.00,
                'total_transactions' => 31,
                'tier'               => 'platinum',
                'registered_at'      => '2022-02-15 09:00:00',
            ],

            // Gold
            [
                'code'               => 'CST-00003',
                'name'               => 'Nia Rahmawati',
                'phone'              => '08123456003',
                'email'              => 'nia.rahma@email.com',
                'address'            => 'Jl. Kenanga No. 8, Lamongan',
                'birth_date'         => '1993-11-05',
                'gender'             => 'female',
                'points'             => 1800,
                'lifetime_points_earned' => 5200,
                'lifetime_spending'  => 2350000.00,
                'total_transactions' => 18,
                'tier'               => 'gold',
                'registered_at'      => '2022-05-20 11:00:00',
            ],
            [
                'code'               => 'CST-00004',
                'name'               => 'Dian Permata',
                'phone'              => '08123456004',
                'email'              => 'dian.permata@email.com',
                'address'            => 'Jl. Dahlia No. 3, Gresik',
                'birth_date'         => '1988-04-18',
                'gender'             => 'female',
                'points'             => 2100,
                'lifetime_points_earned' => 6000,
                'lifetime_spending'  => 2800000.00,
                'total_transactions' => 22,
                'tier'               => 'gold',
                'registered_at'      => '2022-04-01 08:30:00',
            ],
            [
                'code'               => 'CST-00005',
                'name'               => 'Rudi Santoso',
                'phone'              => '08123456005',
                'email'              => 'rudi.santoso@email.com',
                'address'            => 'Jl. Anggrek No. 21, Lamongan',
                'birth_date'         => '1991-09-30',
                'gender'             => 'male',
                'points'             => 1500,
                'lifetime_points_earned' => 4100,
                'lifetime_spending'  => 1950000.00,
                'total_transactions' => 15,
                'tier'               => 'gold',
                'registered_at'      => '2022-08-12 14:00:00',
            ],

            // Silver
            [
                'code'               => 'CST-00006',
                'name'               => 'Ayu Lestari',
                'phone'              => '08123456006',
                'email'              => 'ayu.lestari@email.com',
                'address'            => 'Jl. Cempaka No. 7, Gresik',
                'birth_date'         => '1995-02-14',
                'gender'             => 'female',
                'points'             => 750,
                'lifetime_points_earned' => 2100,
                'lifetime_spending'  => 980000.00,
                'total_transactions' => 8,
                'tier'               => 'silver',
                'registered_at'      => '2023-01-05 10:30:00',
            ],
            [
                'code'               => 'CST-00007',
                'name'               => 'Wahyu Pratama',
                'phone'              => '08123456007',
                'email'              => 'wahyu.pratama@email.com',
                'address'            => 'Jl. Flamboyan No. 15, Lamongan',
                'birth_date'         => '1987-06-25',
                'gender'             => 'male',
                'points'             => 620,
                'lifetime_points_earned' => 1800,
                'lifetime_spending'  => 850000.00,
                'total_transactions' => 7,
                'tier'               => 'silver',
                'registered_at'      => '2023-02-18 09:00:00',
            ],
            [
                'code'               => 'CST-00008',
                'name'               => 'Mega Putri',
                'phone'              => '08123456008',
                'email'              => 'mega.putri@email.com',
                'address'            => 'Jl. Sakura No. 4, Gresik',
                'birth_date'         => '1996-12-01',
                'gender'             => 'female',
                'points'             => 900,
                'lifetime_points_earned' => 2400,
                'lifetime_spending'  => 1100000.00,
                'total_transactions' => 9,
                'tier'               => 'silver',
                'registered_at'      => '2023-03-10 13:00:00',
            ],

            // Bronze
            [
                'code'               => 'CST-00009',
                'name'               => 'Tono Wibowo',
                'phone'              => '08123456009',
                'email'              => 'tono.wibowo@email.com',
                'address'            => 'Jl. Kamboja No. 9, Lamongan',
                'birth_date'         => '1994-08-17',
                'gender'             => 'male',
                'points'             => 200,
                'lifetime_points_earned' => 450,
                'lifetime_spending'  => 210000.00,
                'total_transactions' => 2,
                'tier'               => 'bronze',
                'registered_at'      => '2024-01-20 15:00:00',
            ],
            [
                'code'               => 'CST-00010',
                'name'               => 'Indah Sari',
                'phone'              => '08123456010',
                'email'              => 'indah.sari@email.com',
                'address'            => 'Jl. Tulip No. 6, Gresik',
                'birth_date'         => '1998-05-08',
                'gender'             => 'female',
                'points'             => 150,
                'lifetime_points_earned' => 300,
                'lifetime_spending'  => 165000.00,
                'total_transactions' => 2,
                'tier'               => 'bronze',
                'registered_at'      => '2024-02-14 11:00:00',
            ],
            [
                'code'               => 'CST-00011',
                'name'               => 'Bagas Adi Nugroho',
                'phone'              => '08123456011',
                'email'              => null,
                'address'            => 'Jl. Merpati No. 2, Lamongan',
                'birth_date'         => '2000-01-25',
                'gender'             => 'male',
                'points'             => 85,
                'lifetime_points_earned' => 85,
                'lifetime_spending'  => 85000.00,
                'total_transactions' => 1,
                'tier'               => 'bronze',
                'registered_at'      => '2024-06-05 16:00:00',
            ],
            [
                'code'               => 'CST-00012',
                'name'               => 'Citra Maharani',
                'phone'              => '08123456012',
                'email'              => 'citra.maha@email.com',
                'address'            => 'Jl. Elang No. 11, Gresik',
                'birth_date'         => '1997-10-20',
                'gender'             => 'female',
                'points'             => 64,
                'lifetime_points_earned' => 64,
                'lifetime_spending'  => 64000.00,
                'total_transactions' => 1,
                'tier'               => 'bronze',
                'registered_at'      => '2024-07-18 10:00:00',
            ],
        ];

        foreach ($customers as $c) {
            $custId = Str::uuid()->toString();

            DB::table('customers')->insert([
                'id'                      => $custId,
                'code'                    => $c['code'],
                'name'                    => $c['name'],
                'phone'                   => $c['phone'],
                'email'                   => $c['email'],
                'address'                 => $c['address'],
                'birth_date'              => $c['birth_date'],
                'gender'                  => $c['gender'],
                'points'                  => $c['points'],
                'lifetime_points_earned'  => $c['lifetime_points_earned'],
                'lifetime_spending'       => $c['lifetime_spending'],
                'total_transactions'      => $c['total_transactions'],
                'tier'                    => $c['tier'],
                'is_active'               => true,
                'registered_at'           => $c['registered_at'],
                'created_at'              => $now,
                'updated_at'              => $now,
            ]);

            // Seed 1 customer_point_ledger entry per customer (earned)
            if ($c['lifetime_points_earned'] > 0) {
                DB::table('customer_point_ledgers')->insert([
                    'id'             => Str::uuid(),
                    'customer_id'    => $custId,
                    'type'           => 'earned',
                    'points'         => $c['lifetime_points_earned'],
                    'balance_after'  => $c['points'],
                    'reference_type' => null,
                    'reference_id'   => null,
                    'notes'          => 'Initial seeder — akumulasi poin historis',
                    'expired_at'     => null,
                    'created_by'     => null,
                    'created_at'     => $now,
                    'updated_at'     => $now,
                ]);
            }
        }

        $this->command->info('Customers seeded (' . count($customers) . ' customers).');
    }
}
