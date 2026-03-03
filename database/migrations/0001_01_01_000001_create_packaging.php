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

            // ★ PERUBAHAN: decimal(15,2) → support Rp 1.500,50
            $table->decimal('purchase_price', 15, 2)->default(0)
                  ->comment('Harga beli standar per unit (rupiah, 2 desimal)');
            $table->decimal('selling_price', 15, 2)->default(0)
                  ->comment('Harga jual saat dijual sebagai add-on (rupiah, 2 desimal)');

            // decimal(15,4) → WAC presisi tinggi
            $table->decimal('average_cost', 15, 4)->default(0)
                  ->comment('Weighted Average Cost per unit');

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
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('packaging_materials');
        Schema::dropIfExists('packaging_categories');
    }
};
