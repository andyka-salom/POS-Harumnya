<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MIGRATION 006 — PURCHASES (Pembelian dari Supplier)
 * Membutuhkan: suppliers (002), ingredients (002), packaging (003),
 *              warehouses (000), stores (000)
 *
 * PERUBAHAN DARI VERSI LAMA:
 *   purchases.subtotal / tax / discount / shipping_cost / total :
 *     unsignedBigInteger → decimal(15,2) → support Rp 12.000,59
 *   purchase_items.unit_price / subtotal :
 *     unsignedBigInteger → decimal(15,2)
 *   purchase_items.quantity :
 *     unsignedBigInteger → bigInteger SIGNED
 *     (retur ke supplier bisa negatif)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── PURCHASES (Header) ────────────────────────────────────────────────
        Schema::create('purchases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('purchase_number', 100)->unique();
            $table->uuid('supplier_id');

            // Polimorfik destination: warehouse | store
            $table->string('destination_type', 20)->comment('warehouse | store');
            $table->uuid('destination_id');

            $table->date('purchase_date');
            $table->date('expected_delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();

            $table->enum('status', [
                'draft', 'pending', 'approved',
                'received', 'completed', 'cancelled',
            ])->default('draft');

            // ★ decimal(15,2) → support Rp 12.000,59
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('shipping_cost', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            $table->text('notes')->nullable();
            $table->text('cancellation_reason')->nullable();

            // FK ke users.id (bigint)
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('received_by')->nullable();
            $table->timestamp('received_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_id')
                  ->references('id')->on('suppliers')->restrictOnDelete();
            $table->foreign('created_by')
                  ->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_by')
                  ->references('id')->on('users')->nullOnDelete();
            $table->foreign('received_by')
                  ->references('id')->on('users')->nullOnDelete();

            $table->index('supplier_id');
            $table->index(['destination_type', 'destination_id'], 'idx_pur_destination');
            $table->index(['purchase_date', 'status'], 'idx_pur_date_status');
            $table->index('status');
        });

        // ── PURCHASE ITEMS ────────────────────────────────────────────────────
        Schema::create('purchase_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_id');

            // Polimorfik: ingredient | packaging_material
            $table->string('item_type', 30)->comment('ingredient | packaging_material');
            $table->uuid('item_id');

            // ★ bigInteger SIGNED — retur ke supplier bisa negatif
            $table->bigInteger('quantity')
                  ->comment('Qty (SIGNED: negatif untuk retur ke supplier)');

            // ★ decimal(15,2) → support Rp 12.000,59
            $table->decimal('unit_price', 15, 2)
                  ->comment('Harga beli per unit (rupiah, 2 desimal)');
            $table->decimal('subtotal', 15, 2)
                  ->comment('quantity × unit_price');

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('purchase_id')
                  ->references('id')->on('purchases')->cascadeOnDelete();

            $table->index('purchase_id');
            $table->index(['item_type', 'item_id'], 'idx_pi_item');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
    }
};
