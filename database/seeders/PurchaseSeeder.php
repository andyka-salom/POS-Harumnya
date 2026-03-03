<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * PURCHASE SEEDER
 * Seeds purchase orders dari supplier ke warehouse & store.
 * Juga meng-insert stock_movements sebagai audit trail.
 */
class PurchaseSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $warehouse  = DB::table('warehouses')->where('code', 'WH001')->first();
        $store1     = DB::table('stores')->where('code', 'STR001')->first();
        $store2     = DB::table('stores')->where('code', 'STR002')->first();
        $supplier1  = DB::table('suppliers')->where('code', 'SUP-001')->first();
        $supplier2  = DB::table('suppliers')->where('code', 'SUP-002')->first();
        $supplier3  = DB::table('suppliers')->where('code', 'SUP-003')->first();
        $adminUser  = DB::table('users')->where('email', 'admin@gmail.com')->first();

        if (! $warehouse || ! $supplier1) {
            $this->command->error('Master data belum ada.');
            return;
        }

        $ingredients = DB::table('ingredients')->get()->keyBy('code');
        $packagings  = DB::table('packaging_materials')->get()->keyBy('code');
        $adminId     = $adminUser?->id;

        // ── PURCHASE 1: Pembelian bahan baku ke Gudang (Completed) ────────────
        $this->createPurchase([
            'purchase_number'       => 'PO/2025/01/001',
            'supplier_id'           => $supplier1->id,
            'destination_type'      => 'warehouse',
            'destination_id'        => $warehouse->id,
            'purchase_date'         => '2025-01-05',
            'expected_delivery_date'=> '2025-01-10',
            'actual_delivery_date'  => '2025-01-09',
            'status'                => 'completed',
            'shipping_cost'         => 50000.00,
            'tax'                   => 0.00,
            'discount'              => 0.00,
            'notes'                 => 'Pembelian bahan baku awal tahun 2025',
            'created_by'            => $adminId,
            'approved_by'           => $adminId,
            'approved_at'           => '2025-01-06 08:00:00',
            'received_by'           => $adminId,
            'received_at'           => '2025-01-09 10:00:00',
        ], [
            ['type' => 'ingredient', 'code' => 'ING-EO-001', 'qty' => 3000,  'price' => 1500.00],
            ['type' => 'ingredient', 'code' => 'ING-EO-002', 'qty' => 1000,  'price' => 5000.00],
            ['type' => 'ingredient', 'code' => 'ING-EO-003', 'qty' => 1500,  'price' => 4500.00],
            ['type' => 'ingredient', 'code' => 'ING-FO-001', 'qty' => 5000,  'price' => 800.00],
            ['type' => 'ingredient', 'code' => 'ING-FO-002', 'qty' => 3000,  'price' => 1200.00],
        ], $ingredients, $packagings, $warehouse->id, 'warehouse', $now);

        // ── PURCHASE 2: Pembelian Alkohol ke Gudang (Completed) ───────────────
        $this->createPurchase([
            'purchase_number'       => 'PO/2025/01/002',
            'supplier_id'           => $supplier3->id,
            'destination_type'      => 'warehouse',
            'destination_id'        => $warehouse->id,
            'purchase_date'         => '2025-01-08',
            'expected_delivery_date'=> '2025-01-12',
            'actual_delivery_date'  => '2025-01-11',
            'status'                => 'completed',
            'shipping_cost'         => 25000.00,
            'tax'                   => 0.00,
            'discount'              => 0.00,
            'notes'                 => 'Pembelian alkohol & additive',
            'created_by'            => $adminId,
            'approved_by'           => $adminId,
            'approved_at'           => '2025-01-09 08:00:00',
            'received_by'           => $adminId,
            'received_at'           => '2025-01-11 14:00:00',
        ], [
            ['type' => 'ingredient', 'code' => 'ING-AL-001',  'qty' => 30000, 'price' => 50.00],
            ['type' => 'ingredient', 'code' => 'ING-AL-002',  'qty' => 10000, 'price' => 150.00],
            ['type' => 'ingredient', 'code' => 'ING-BO-001',  'qty' => 8000,  'price' => 500.00],
            ['type' => 'ingredient', 'code' => 'ING-BO-002',  'qty' => 8000,  'price' => 400.00],
            ['type' => 'ingredient', 'code' => 'ING-ADD-001', 'qty' => 2000,  'price' => 2000.00],
            ['type' => 'ingredient', 'code' => 'ING-ADD-002', 'qty' => 3000,  'price' => 300.00],
        ], $ingredients, $packagings, $warehouse->id, 'warehouse', $now);

        // ── PURCHASE 3: Pembelian Packaging ke Gudang (Completed) ────────────
        $this->createPurchase([
            'purchase_number'       => 'PO/2025/01/003',
            'supplier_id'           => $supplier2->id,
            'destination_type'      => 'warehouse',
            'destination_id'        => $warehouse->id,
            'purchase_date'         => '2025-01-10',
            'expected_delivery_date'=> '2025-01-15',
            'actual_delivery_date'  => '2025-01-14',
            'status'                => 'completed',
            'shipping_cost'         => 35000.00,
            'tax'                   => 0.00,
            'discount'              => 0.00,
            'notes'                 => 'Pembelian packaging awal tahun',
            'created_by'            => $adminId,
            'approved_by'           => $adminId,
            'approved_at'           => '2025-01-11 08:00:00',
            'received_by'           => $adminId,
            'received_at'           => '2025-01-14 11:00:00',
        ], [
            ['type' => 'packaging', 'code' => 'PKG-BOT-30',  'qty' => 300,  'price' => 8000.00],
            ['type' => 'packaging', 'code' => 'PKG-BOT-50',  'qty' => 500,  'price' => 10000.00],
            ['type' => 'packaging', 'code' => 'PKG-BOT-100', 'qty' => 200,  'price' => 15000.00],
            ['type' => 'packaging', 'code' => 'PKG-TTP-30',  'qty' => 400,  'price' => 2000.00],
            ['type' => 'packaging', 'code' => 'PKG-TTP-50',  'qty' => 600,  'price' => 2500.00],
            ['type' => 'packaging', 'code' => 'PKG-PB-S',    'qty' => 300,  'price' => 3000.00],
            ['type' => 'packaging', 'code' => 'PKG-PB-M',    'qty' => 200,  'price' => 5000.00],
            ['type' => 'packaging', 'code' => 'PKG-GC-STD',  'qty' => 400,  'price' => 2000.00],
            ['type' => 'packaging', 'code' => 'PKG-GC-PRM',  'qty' => 150,  'price' => 5000.00],
        ], $ingredients, $packagings, $warehouse->id, 'warehouse', $now);

        // ── PURCHASE 4: Pembelian langsung ke Toko Lamongan (Completed) ───────
        $this->createPurchase([
            'purchase_number'       => 'PO/2025/02/001',
            'supplier_id'           => $supplier1->id,
            'destination_type'      => 'store',
            'destination_id'        => $store1->id,
            'purchase_date'         => '2025-02-01',
            'expected_delivery_date'=> '2025-02-05',
            'actual_delivery_date'  => '2025-02-04',
            'status'                => 'completed',
            'shipping_cost'         => 20000.00,
            'tax'                   => 0.00,
            'discount'              => 100000.00,
            'notes'                 => 'Pembelian tambahan untuk Toko Lamongan',
            'created_by'            => $adminId,
            'approved_by'           => $adminId,
            'approved_at'           => '2025-02-02 08:00:00',
            'received_by'           => $adminId,
            'received_at'           => '2025-02-04 09:00:00',
        ], [
            ['type' => 'ingredient', 'code' => 'ING-FO-001', 'qty' => 2000, 'price' => 800.00],
            ['type' => 'ingredient', 'code' => 'ING-FO-002', 'qty' => 1500, 'price' => 1200.00],
            ['type' => 'ingredient', 'code' => 'ING-AL-001', 'qty' => 8000, 'price' => 50.00],
        ], $ingredients, $packagings, $store1->id, 'store', $now);

        // ── PURCHASE 5: Draft / Pending (belum selesai) ───────────────────────
        $this->createPurchase([
            'purchase_number'       => 'PO/2025/03/001',
            'supplier_id'           => $supplier2->id,
            'destination_type'      => 'warehouse',
            'destination_id'        => $warehouse->id,
            'purchase_date'         => '2025-03-01',
            'expected_delivery_date'=> '2025-03-10',
            'actual_delivery_date'  => null,
            'status'                => 'approved',
            'shipping_cost'         => 0.00,
            'tax'                   => 0.00,
            'discount'              => 0.00,
            'notes'                 => 'PO packaging Q1 2025',
            'created_by'            => $adminId,
            'approved_by'           => $adminId,
            'approved_at'           => '2025-03-02 09:00:00',
            'received_by'           => null,
            'received_at'           => null,
        ], [
            ['type' => 'packaging', 'code' => 'PKG-BOT-50',  'qty' => 300,  'price' => 10000.00],
            ['type' => 'packaging', 'code' => 'PKG-BOT-100', 'qty' => 150,  'price' => 15000.00],
            ['type' => 'packaging', 'code' => 'PKG-PB-M',    'qty' => 200,  'price' => 5000.00],
        ], $ingredients, $packagings, $warehouse->id, 'warehouse', $now, false); // false = jangan buat stock movement

        $this->command->info('Purchases seeded (4 completed + 1 approved).');
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function createPurchase(
        array $header,
        array $items,
        $ingredients,
        $packagings,
        string $locationId,
        string $locationType,
        $now,
        bool $createMovements = true
    ): void {
        $purchaseId = Str::uuid()->toString();

        // Hitung subtotal dari items
        $subtotal = 0;
        foreach ($items as $item) {
            $subtotal += $item['qty'] * $item['price'];
        }

        $total = $subtotal
               - ($header['discount'] ?? 0)
               + ($header['tax'] ?? 0)
               + ($header['shipping_cost'] ?? 0);

        DB::table('purchases')->insert([
            'id'                     => $purchaseId,
            'purchase_number'        => $header['purchase_number'],
            'supplier_id'            => $header['supplier_id'],
            'destination_type'       => $header['destination_type'],
            'destination_id'         => $header['destination_id'],
            'purchase_date'          => $header['purchase_date'],
            'expected_delivery_date' => $header['expected_delivery_date'],
            'actual_delivery_date'   => $header['actual_delivery_date'] ?? null,
            'status'                 => $header['status'],
            'subtotal'               => $subtotal,
            'tax'                    => $header['tax'] ?? 0.00,
            'discount'               => $header['discount'] ?? 0.00,
            'shipping_cost'          => $header['shipping_cost'] ?? 0.00,
            'total'                  => $total,
            'notes'                  => $header['notes'] ?? null,
            'cancellation_reason'    => null,
            'created_by'             => $header['created_by'] ?? null,
            'approved_by'            => $header['approved_by'] ?? null,
            'approved_at'            => $header['approved_at'] ?? null,
            'received_by'            => $header['received_by'] ?? null,
            'received_at'            => $header['received_at'] ?? null,
            'created_at'             => $now,
            'updated_at'             => $now,
        ]);

        foreach ($items as $item) {
            $isIngredient = $item['type'] === 'ingredient';
            $masterItem   = $isIngredient
                ? ($ingredients[$item['code']] ?? null)
                : ($packagings[$item['code']] ?? null);

            if (! $masterItem) continue;

            $itemSubtotal = $item['qty'] * $item['price'];

            DB::table('purchase_items')->insert([
                'id'          => Str::uuid(),
                'purchase_id' => $purchaseId,
                'item_type'   => $isIngredient ? 'ingredient' : 'packaging_material',
                'item_id'     => $masterItem->id,
                'quantity'    => $item['qty'],
                'unit_price'  => $item['price'],
                'subtotal'    => $itemSubtotal,
                'notes'       => null,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);

            // Stock movement audit trail (hanya jika status completed/received)
            if ($createMovements) {
                $costPerUnit = (float) $item['price'];
                $qtyChange   = (int) $item['qty'];

                DB::table('stock_movements')->insert([
                    'id'               => Str::uuid(),
                    'location_type'    => $locationType,
                    'location_id'      => $locationId,
                    'item_type'        => $isIngredient ? 'ingredient' : 'packaging_material',
                    'item_id'          => $masterItem->id,
                    'movement_type'    => 'purchase_in',
                    'qty_change'       => $qtyChange,
                    'qty_before'       => 0,
                    'qty_after'        => $qtyChange,
                    'unit_cost'        => $costPerUnit,
                    'total_cost'       => round($qtyChange * $costPerUnit, 2),
                    'avg_cost_before'  => 0.0000,
                    'avg_cost_after'   => $costPerUnit,
                    'reference_type'   => 'App\\Models\\Purchase',
                    'reference_id'     => $purchaseId,
                    'reference_number' => $header['purchase_number'],
                    'movement_date'    => $header['purchase_date'],
                    'notes'            => 'Pembelian dari supplier',
                    'created_by'       => $header['created_by'] ?? null,
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ]);
            }
        }
    }
}
