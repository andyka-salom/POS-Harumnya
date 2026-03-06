<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MIGRATION 003: PACKAGING MATERIALS
     */
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | PACKAGING CATEGORIES
        |--------------------------------------------------------------------------
        */
        Schema::create('packaging_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 100); // Botol, Tutup, Box, Paper Bag, Ribbon
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        /*
        |--------------------------------------------------------------------------
        | PACKAGING MATERIALS
        |--------------------------------------------------------------------------
        */
        Schema::create('packaging_materials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('packaging_category_id');

            // size_id nullable; FK ke sizes ditambahkan setelah migration 004
            $table->uuid('size_id')->nullable()
                  ->comment('Untuk packaging size-specific (botol, tutup); FK ditambah di mig 004');

            $table->string('code', 100)->unique();
            $table->string('name', 255);
            $table->string('unit', 20)->default('pcs');
            $table->string('image', 500)->nullable();
            $table->text('description')->nullable();

            $table->boolean('is_available_as_addon')->default(true)
                  ->comment('Tampil di tab Kemasan POS sebagai pilihan add-on');

            // ★ decimal(15,2) → support Rp 1.500,50
            $table->decimal('purchase_price', 15, 2)->default(0)
                  ->comment('Harga beli standar per unit (rupiah, 2 desimal)');

            $table->decimal('selling_price', 15, 2)->default(0)
                  ->comment('Harga jual saat dijual sebagai add-on; diabaikan jika is_free = true');

            /*
            |----------------------------------------------------------------------
            | FREE PACKAGING — Opsi B
            |----------------------------------------------------------------------
            | is_free          → true  : packaging selalu gratis ke customer
            |                    false : gunakan selling_price seperti biasa
            |
            | free_condition_note → catatan human-readable mengapa gratis,
            |                       misal: "Gratis untuk setiap pembelian"
            |                       Tidak dipakai sebagai logic; murni informatif.
            |
            | Catatan biaya:
            |   Meskipun is_free = true, average_cost TETAP dihitung.
            |   Hal ini memastikan laporan HPP / COGS tetap akurat.
            |
            | Contoh penggunaan di application layer:
            |   $finalPrice = $packaging->is_free ? 0 : $packaging->selling_price;
            |----------------------------------------------------------------------
            */
            $table->boolean('is_free')->default(false)
                  ->comment('True = gratis ke customer; average_cost tetap dihitung untuk laporan HPP');

            $table->string('free_condition_note', 255)->nullable()
                  ->comment('Catatan kondisi gratis, misal: Gratis untuk setiap pembelian. Bersifat informatif, bukan logic.');

            // decimal(15,4) → WAC presisi tinggi
            $table->decimal('average_cost', 15, 4)->default(0)
                  ->comment('Weighted Average Cost per unit; tetap dihitung meski is_free = true');

            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('packaging_category_id')
                  ->references('id')->on('packaging_categories')->restrictOnDelete();
            // FK size_id → sizes akan ditambahkan di migration 004

            $table->index('packaging_category_id');
            $table->index('size_id');
            $table->index(['code', 'is_active']);
            $table->index(['is_active', 'is_available_as_addon', 'sort_order'],
                          'idx_pkg_active_addon_sort');
            $table->index(['is_free', 'is_active'],
                          'idx_pkg_free_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('packaging_materials');
        Schema::dropIfExists('packaging_categories');
    }
};
