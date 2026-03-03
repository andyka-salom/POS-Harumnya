<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MIGRATION 005 — MULTI-LOCATION STOCK
 * Membutuhkan: warehouses (000), stores (000), ingredients (002), packaging (003)
 *
 * PERUBAHAN DARI VERSI LAMA:
 *   total_value  : bigInteger → decimal(15,2) — nilai rupiah support desimal
 *   average_cost : sudah decimal(15,4) → tidak berubah
 *
 * TETAP SAMA (sudah benar):
 *   quantity, min_stock, max_stock : bigInteger SIGNED → bisa negatif ✓
 *   last_in_qty, last_out_qty      : bigInteger SIGNED ✓
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── WAREHOUSE INGREDIENT STOCKS ───────────────────────────────────────
        Schema::create('warehouse_ingredient_stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('warehouse_id');
            $table->uuid('ingredient_id');

            // ★ bigInteger SIGNED — stok bisa negatif (pengambilan darurat, dll)
            $table->bigInteger('quantity')->default(0)
                  ->comment('Stok saat ini, SIGNED: bisa negatif');
            $table->bigInteger('min_stock')->nullable()
                  ->comment('Ambang batas reorder alert');
            $table->bigInteger('max_stock')->nullable()
                  ->comment('Kapasitas maksimum gudang');

            // ★ decimal(15,4) → WAC presisi Rp 0,0025 per ml
            $table->decimal('average_cost', 15, 4)->default(0)
                  ->comment('Weighted Average Cost per unit');
            // ★ decimal(15,2) → nilai stok support Rp 1.234.567,89
            $table->decimal('total_value', 15, 2)->default(0)
                  ->comment('quantity × average_cost (rupiah, 2 desimal)');

            $table->timestamp('last_in_at')->nullable();
            $table->foreignId('last_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->bigInteger('last_in_qty')->nullable();

            $table->timestamp('last_out_at')->nullable();
            $table->foreignId('last_out_by')->nullable()->constrained('users')->nullOnDelete();
            $table->bigInteger('last_out_qty')->nullable();

            $table->timestamps();

            $table->foreign('warehouse_id')
                  ->references('id')->on('warehouses')->cascadeOnDelete();
            $table->foreign('ingredient_id')
                  ->references('id')->on('ingredients')->restrictOnDelete();

            $table->unique(['warehouse_id', 'ingredient_id'], 'uq_wis_wh_ing');
            $table->index(['warehouse_id', 'quantity'], 'idx_wis_qty');
            $table->index(['quantity', 'min_stock'], 'idx_wis_low_stock');   // alert stok rendah
            $table->index('ingredient_id');
        });

        // ── WAREHOUSE PACKAGING STOCKS ────────────────────────────────────────
        Schema::create('warehouse_packaging_stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('warehouse_id');
            $table->uuid('packaging_material_id');

            $table->bigInteger('quantity')->default(0);
            $table->bigInteger('min_stock')->nullable();
            $table->bigInteger('max_stock')->nullable();

            $table->decimal('average_cost', 15, 4)->default(0);
            $table->decimal('total_value', 15, 2)->default(0);

            $table->timestamp('last_in_at')->nullable();
            $table->foreignId('last_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->bigInteger('last_in_qty')->nullable();

            $table->timestamp('last_out_at')->nullable();
            $table->foreignId('last_out_by')->nullable()->constrained('users')->nullOnDelete();
            $table->bigInteger('last_out_qty')->nullable();

            $table->timestamps();

            $table->foreign('warehouse_id')
                  ->references('id')->on('warehouses')->cascadeOnDelete();
            $table->foreign('packaging_material_id')
                  ->references('id')->on('packaging_materials')->restrictOnDelete();

            $table->unique(['warehouse_id', 'packaging_material_id'], 'uq_wps_wh_pkg');
            $table->index(['warehouse_id', 'quantity'], 'idx_wps_qty');
            $table->index(['quantity', 'min_stock'], 'idx_wps_low_stock');
        });

        // ── STORE INGREDIENT STOCKS ───────────────────────────────────────────
        Schema::create('store_ingredient_stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_id');
            $table->uuid('ingredient_id');

            $table->bigInteger('quantity')->default(0);
            $table->bigInteger('min_stock')->nullable();
            $table->bigInteger('max_stock')->nullable();

            $table->decimal('average_cost', 15, 4)->default(0);
            $table->decimal('total_value', 15, 2)->default(0);

            $table->timestamp('last_in_at')->nullable();
            $table->foreignId('last_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->bigInteger('last_in_qty')->nullable();

            $table->timestamp('last_out_at')->nullable();
            $table->foreignId('last_out_by')->nullable()->constrained('users')->nullOnDelete();
            $table->bigInteger('last_out_qty')->nullable();

            $table->timestamps();

            $table->foreign('store_id')
                  ->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('ingredient_id')
                  ->references('id')->on('ingredients')->restrictOnDelete();

            $table->unique(['store_id', 'ingredient_id'], 'uq_sis_store_ing');
            $table->index(['store_id', 'quantity'], 'idx_sis_qty');
            $table->index(['quantity', 'min_stock'], 'idx_sis_low_stock');
            $table->index('ingredient_id');
        });

        // ── STORE PACKAGING STOCKS ────────────────────────────────────────────
        Schema::create('store_packaging_stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_id');
            $table->uuid('packaging_material_id');

            $table->bigInteger('quantity')->default(0);
            $table->bigInteger('min_stock')->nullable();
            $table->bigInteger('max_stock')->nullable();

            $table->decimal('average_cost', 15, 4)->default(0);
            $table->decimal('total_value', 15, 2)->default(0);

            $table->timestamp('last_in_at')->nullable();
            $table->foreignId('last_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->bigInteger('last_in_qty')->nullable();

            $table->timestamp('last_out_at')->nullable();
            $table->foreignId('last_out_by')->nullable()->constrained('users')->nullOnDelete();
            $table->bigInteger('last_out_qty')->nullable();

            $table->timestamps();

            $table->foreign('store_id')
                  ->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('packaging_material_id')
                  ->references('id')->on('packaging_materials')->restrictOnDelete();

            $table->unique(['store_id', 'packaging_material_id'], 'uq_sps_store_pkg');
            $table->index(['store_id', 'quantity'], 'idx_sps_qty');
            $table->index(['quantity', 'min_stock'], 'idx_sps_low_stock');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_packaging_stocks');
        Schema::dropIfExists('store_ingredient_stocks');
        Schema::dropIfExists('warehouse_packaging_stocks');
        Schema::dropIfExists('warehouse_ingredient_stocks');
    }
};
