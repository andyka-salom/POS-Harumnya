<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MIGRATION 004: VARIANTS, INTENSITIES, SIZES, AND PRODUCTS
     */
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | VARIANTS (Produk Parfum)
        |--------------------------------------------------------------------------
        */
        Schema::create('variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->enum('gender', ['male', 'female', 'unisex'])->index();
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order']);
        });

        /*
        |--------------------------------------------------------------------------
        | INTENSITIES (Konsentrasi Parfum)
        |--------------------------------------------------------------------------
        */
        Schema::create('intensities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 20)->unique(); // EDT, EDP, EXT
            $table->string('name', 100);

            $table->string('oil_ratio', 10)
                ->comment('Ratio bibit parfum, contoh: 2:1, 1:1');
            $table->string('alcohol_ratio', 10)
                ->comment('Ratio alkohol, contoh: 1:1, 1:2');

            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order']);
        });

        /*
        |--------------------------------------------------------------------------
        | SIZES (Ukuran Botol)
        |--------------------------------------------------------------------------
        */
        Schema::create('sizes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedSmallInteger('volume_ml')->unique();
            $table->string('name', 50);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order']);
        });

        // Tambah FK packaging_materials.size_id → sizes (sizes baru saja dibuat)
        Schema::table('packaging_materials', function (Blueprint $table) {
            $table->foreign('size_id')
                  ->references('id')->on('sizes')->nullOnDelete();
        });

        /*
        |--------------------------------------------------------------------------
        | INTENSITY SIZE PRICES (Harga Tetap)
        | Harga ditentukan oleh Intensity + Size, BUKAN dari cost
        |--------------------------------------------------------------------------
        */
        Schema::create('intensity_size_prices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('intensity_id');
            $table->uuid('size_id');

            // ★ decimal(15,2) — support Rp 85.000,50
            $table->decimal('price', 15, 2)
                  ->comment('Harga jual tetap per kombinasi intensity+size (rupiah, 2 desimal)');

            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('intensity_id')
                  ->references('id')->on('intensities')->cascadeOnDelete();
            $table->foreign('size_id')
                  ->references('id')->on('sizes')->cascadeOnDelete();

            $table->unique(['intensity_id', 'size_id'], 'uq_isp_intensity_size');
            // Index utama POS: WHERE intensity_id=? AND size_id=? AND is_active=1
            $table->index(['intensity_id', 'size_id', 'is_active'], 'idx_isp_lookup');
            // Index untuk getAvailableSizes: WHERE intensity_id=? AND is_active=1
            $table->index(['intensity_id', 'is_active'], 'idx_isp_by_intensity');
        });

        // ── INTENSITY SIZE QUANTITIES ─────────────────────────────────────────
        // Volume predefined per Intensity+Size; INTEGER karena sudah dikalibrasi manual
        // Contoh: EDT 50ml → oil=15ml, alcohol=35ml, total=50ml
        Schema::create('intensity_size_quantities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('intensity_id');
            $table->uuid('size_id');

            // Tetap integer — sudah dikalibrasi manual, bukan hasil hitung
            $table->unsignedSmallInteger('oil_quantity')
                  ->comment('Volume fragrance oil (ml, integer, hasil kalibrasi manual)');
            $table->unsignedSmallInteger('alcohol_quantity')
                  ->comment('Volume alcohol (ml, integer, hasil kalibrasi manual)');
            $table->unsignedSmallInteger('total_volume')
                  ->comment('oil_quantity + alcohol_quantity; HARUS = sizes.volume_ml');

            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('intensity_id')
                  ->references('id')->on('intensities')->cascadeOnDelete();
            $table->foreign('size_id')
                  ->references('id')->on('sizes')->cascadeOnDelete();

            $table->unique(['intensity_id', 'size_id'], 'uq_isq_intensity_size');
            $table->index(['intensity_id', 'size_id', 'is_active'], 'idx_isq_lookup');
        });

        // ── VARIANT RECIPES (Base 30ml) ───────────────────────────────────────
        // Resep BASE per Variant+Intensity; di-scale saat generate product
        Schema::create('variant_recipes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('variant_id');
            $table->uuid('intensity_id');
            $table->uuid('ingredient_id');

            $table->decimal('base_quantity', 15, 4)
                  ->comment('Qty untuk base size 30ml; di-scale ke ukuran lain');
            $table->string('unit', 20)->default('ml');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('variant_id')
                  ->references('id')->on('variants')->cascadeOnDelete();
            $table->foreign('intensity_id')
                  ->references('id')->on('intensities')->restrictOnDelete();
            $table->foreign('ingredient_id')
                  ->references('id')->on('ingredients')->restrictOnDelete();

            $table->unique(
                ['variant_id', 'intensity_id', 'ingredient_id'],
                'uq_variant_recipe_item'
            );
            $table->index(['variant_id', 'intensity_id'], 'idx_vr_variant_intensity');
            $table->index('ingredient_id');
        });
       // ── PRODUCTS ──────────────────────────────────────────────────────────
        // Kombinasi Variant+Intensity+Size
        // SISTEM MADE-TO-ORDER: produk belum tentu ada di sini; harga tetap bisa
        // diambil dari intensity_size_prices. product_id di transaksi = NULLABLE.
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('sku', 100)->unique();
            $table->uuid('variant_id');
            $table->uuid('intensity_id');
            $table->uuid('size_id');

            // Format: "{Variant} - {Intensity Code} - {Size}ml"
            $table->string('name', 255);

            // ★ decimal(15,2) — support Rp 85.000,50
            $table->decimal('selling_price', 15, 2)
                  ->comment('Snapshot harga dari intensity_size_prices saat generate');
            $table->decimal('production_cost', 15, 2)->default(0)
                  ->comment('HPP total bahan untuk size ini (rupiah)');
            // ★ SIGNED: gross_profit bisa negatif jika HPP > harga jual
            $table->decimal('gross_profit', 15, 2)->default(0)
                  ->comment('selling_price - production_cost (bisa negatif)');
            $table->decimal('gross_margin_percentage', 5, 2)->default(0)
                  ->comment('(gross_profit / selling_price) × 100');

            $table->string('barcode', 100)->nullable()->unique();
            $table->string('image', 500)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('variant_id')
                  ->references('id')->on('variants')->restrictOnDelete();
            $table->foreign('intensity_id')
                  ->references('id')->on('intensities')->restrictOnDelete();
            $table->foreign('size_id')
                  ->references('id')->on('sizes')->restrictOnDelete();

            $table->unique(
                ['variant_id', 'intensity_id', 'size_id'],
                'uq_product_combination'
            );
            // Index utama POS: cek apakah kombinasi sudah di-generate
            $table->index(
                ['variant_id', 'intensity_id', 'size_id', 'is_active'],
                'idx_product_pos_lookup'
            );
            $table->index(['is_active', 'sort_order']);
            $table->index('sku');
        });

        // ── PRODUCT RECIPES (Denormalized, Scaled) ────────────────────────────
        // Salinan variant_recipes yang sudah di-scale berdasarkan ISQ
        Schema::create('product_recipes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->uuid('ingredient_id');

            // Integer — hasil kalibrasi manual, sudah di-scale
            $table->unsignedSmallInteger('quantity')
                  ->comment('Qty scaled dalam ml untuk size ini (integer, hasil kalibrasi)');
            $table->string('unit', 20)->default('ml');

            // Snapshot cost saat product di-generate (historis)
            $table->decimal('unit_cost', 15, 4)->default(0)
                  ->comment('WAC per unit ingredient saat generate (presisi 4 desimal)');
            // ★ decimal(15,2)
            $table->decimal('total_cost', 15, 2)->default(0)
                  ->comment('quantity × unit_cost (rupiah, 2 desimal)');

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('product_id')
                  ->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('ingredient_id')
                  ->references('id')->on('ingredients')->restrictOnDelete();

            $table->unique(['product_id', 'ingredient_id'], 'uq_product_ingredient');
            $table->index('product_id');
            $table->index('ingredient_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_recipes');
        Schema::dropIfExists('products');
        Schema::dropIfExists('variant_recipes');
        Schema::dropIfExists('intensity_size_quantities');
        Schema::dropIfExists('intensity_size_prices');
        Schema::dropIfExists('sizes');
        Schema::dropIfExists('intensities');
        Schema::dropIfExists('variants');
    }
};
