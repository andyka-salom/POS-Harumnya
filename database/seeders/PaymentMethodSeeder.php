<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $methods = [
            [
                'code'            => 'CASH',
                'name'            => 'Tunai',
                'type'            => 'cash',
                'has_admin_fee'   => false,
                'admin_fee_pct'   => 0.00,
                'can_give_change' => true,
                'sort_order'      => 1,
            ],
            [
                'code'            => 'QRIS',
                'name'            => 'QRIS',
                'type'            => 'qris',
                'has_admin_fee'   => true,
                'admin_fee_pct'   => 0.70,
                'can_give_change' => false,
                'sort_order'      => 2,
            ],
            [
                'code'            => 'QRIS-BCA',
                'name'            => 'QRIS BCA',
                'type'            => 'qris',
                'has_admin_fee'   => true,
                'admin_fee_pct'   => 0.70,
                'can_give_change' => false,
                'sort_order'      => 3,
            ],
            [
                'code'            => 'TRF-BCA',
                'name'            => 'Transfer BCA',
                'type'            => 'transfer',
                'has_admin_fee'   => false,
                'admin_fee_pct'   => 0.00,
                'can_give_change' => false,
                'sort_order'      => 4,
            ],
            [
                'code'            => 'TRF-MANDIRI',
                'name'            => 'Transfer Mandiri',
                'type'            => 'transfer',
                'has_admin_fee'   => false,
                'admin_fee_pct'   => 0.00,
                'can_give_change' => false,
                'sort_order'      => 5,
            ],
            [
                'code'            => 'TRF-BRI',
                'name'            => 'Transfer BRI',
                'type'            => 'transfer',
                'has_admin_fee'   => false,
                'admin_fee_pct'   => 0.00,
                'can_give_change' => false,
                'sort_order'      => 6,
            ],
            [
                'code'            => 'GOPAY',
                'name'            => 'GoPay',
                'type'            => 'ewallet',
                'has_admin_fee'   => true,
                'admin_fee_pct'   => 0.70,
                'can_give_change' => false,
                'sort_order'      => 7,
            ],
            [
                'code'            => 'OVO',
                'name'            => 'OVO',
                'type'            => 'ewallet',
                'has_admin_fee'   => true,
                'admin_fee_pct'   => 0.70,
                'can_give_change' => false,
                'sort_order'      => 8,
            ],
            [
                'code'            => 'DANA',
                'name'            => 'DANA',
                'type'            => 'ewallet',
                'has_admin_fee'   => true,
                'admin_fee_pct'   => 0.70,
                'can_give_change' => false,
                'sort_order'      => 9,
            ],
            [
                'code'            => 'DEBIT-BCA',
                'name'            => 'Kartu Debit BCA',
                'type'            => 'card',
                'has_admin_fee'   => true,
                'admin_fee_pct'   => 1.00,
                'can_give_change' => false,
                'sort_order'      => 10,
            ],
        ];

        foreach ($methods as $m) {
            DB::table('payment_methods')->insert([
                'id'              => Str::uuid(),
                'code'            => $m['code'],
                'name'            => $m['name'],
                'type'            => $m['type'],
                'has_admin_fee'   => $m['has_admin_fee'],
                'admin_fee_pct'   => $m['admin_fee_pct'],
                'can_give_change' => $m['can_give_change'],
                'is_active'       => true,
                'sort_order'      => $m['sort_order'],
                'created_at'      => $now,
                'updated_at'      => $now,
            ]);
        }

        $this->command->info('Payment methods seeded (' . count($methods) . ' methods).');
    }
}
