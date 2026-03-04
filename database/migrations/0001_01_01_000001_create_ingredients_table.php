<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MIGRATION 002: INGREDIENTS & SUPPLIERS
     *
     * Perubahan dari versi sebelumnya:
     *   - ingredient_categories: tambah kolom `ingredient_type` (oil | alcohol | other)
     *     → digunakan untuk mapping scaling ke intensity_size_quantities
     */
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | INGREDIENT CATEGORIES
        |--------------------------------------------------------------------------
        */
        Schema::create('ingredient_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();

            /**
             * ingredient_type digunakan untuk mapping ke intensity_size_quantities:
             *
             *   oil      → oil_quantity      (fragrance oil, bibit parfum, dll)
             *   alcohol  → alcohol_quantity  (ethanol, isopropyl, dll)
             *   other    → other_quantity    (air suling, fixative, dll)
             *
             * Scaling di RecipeController::calculateSizePreview() dan
             * autoGenerateProducts() menggunakan field ini untuk menentukan
             * target volume per bahan berdasarkan IntensitySizeQuantity.
             */
            $table->enum('ingredient_type', ['oil', 'alcohol', 'other'])
                  ->default('other')
                  ->comment('Tipe bahan untuk mapping scaling: oil, alcohol, atau other');

            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
            $table->index('ingredient_type');
        });

        /*
        |--------------------------------------------------------------------------
        | SUPPLIERS
        |--------------------------------------------------------------------------
        */
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->string('contact_person')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();

            $table->enum('payment_term', [
                'cash',
                'credit_7',
                'credit_14',
                'credit_30',
                'credit_60',
            ])->default('cash');

            // ★ decimal(15,2) → support Rp 5.000.000,50
            $table->decimal('credit_limit', 15, 2)->default(0)
                  ->comment('Batas kredit (rupiah, 2 desimal)');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['code', 'is_active']);
        });

        /*
        |--------------------------------------------------------------------------
        | INGREDIENTS
        |--------------------------------------------------------------------------
        */
        Schema::create('ingredients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ingredient_category_id');
            $table->string('code', 100)->unique();
            $table->string('name', 255);
            $table->string('unit', 50)->default('ml')
                  ->comment('ml, gr, kg, liter, pcs');
            $table->text('description')->nullable();
            $table->string('image')->nullable();

            // HPP — Weighted Average Cost, diperbarui otomatis via Purchase
            $table->decimal('average_cost', 15, 4)->default(0)
                  ->comment('Weighted Average Cost per unit, auto-update tiap pembelian');

            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('ingredient_category_id')
                  ->references('id')->on('ingredient_categories')
                  ->onDelete('restrict');

            $table->index('ingredient_category_id');
            $table->index(['code', 'is_active']);
            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingredients');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('ingredient_categories');
    }
};
