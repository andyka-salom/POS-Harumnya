<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MIGRATION 011 — STORE CATEGORIES
 * Membutuhkan: stores (000), variants (004)
 *
 * Setiap store dikategorikan (L / M / S).
 * Tiap kategori menentukan variant mana yang BOLEH dijual (whitelist).
 *
 * DESAIN:
 *   Whitelist (bukan blacklist) → variant baru TIDAK otomatis muncul
 *   Fallback → store tanpa kategori (store_category_id null) → tampil semua
 *   Override → allow_all_variants = true → ignore whitelist
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── STORE CATEGORIES ───────────────────────────────────────────────────
        Schema::create('store_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 20)->unique()
                  ->comment('Kode pendek, contoh: L, M, S atau GOLD, SILVER');
            $table->string('name', 100)
                  ->comment('Nama lengkap, contoh: Large, Medium, Small');
            $table->text('description')->nullable();
            $table->boolean('allow_all_variants')->default(false)
                  ->comment('true = ignore whitelist, semua variant tampil');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order']);
        });

        // ── STORE CATEGORY VARIANTS (Whitelist) ────────────────────────────────
        Schema::create('store_category_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_category_id');
            $table->uuid('variant_id');
            $table->boolean('is_active')->default(true)
                  ->comment('Bisa di-nonaktifkan sementara tanpa hapus record');
            $table->timestamps();

            $table->foreign('store_category_id')
                  ->references('id')->on('store_categories')->cascadeOnDelete();
            $table->foreign('variant_id')
                  ->references('id')->on('variants')->cascadeOnDelete();

            $table->unique(
                ['store_category_id', 'variant_id'],
                'uq_scv_category_variant'
            );
            $table->index(['store_category_id', 'is_active'], 'idx_scv_active');
            $table->index('variant_id');
        });

        // ── Tambah store_category_id ke stores ────────────────────────────────
        // (store_categories baru saja dibuat di atas)
        Schema::table('stores', function (Blueprint $table) {
            $table->uuid('store_category_id')->nullable()->after('code')
                  ->comment('null = tidak ada filter variant (semua variant tampil)');

            $table->foreign('store_category_id')
                  ->references('id')->on('store_categories')->nullOnDelete();

            $table->index('store_category_id');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropForeign(['store_category_id']);
            $table->dropIndex(['store_category_id']);
            $table->dropColumn('store_category_id');
        });

        Schema::dropIfExists('store_category_variants');
        Schema::dropIfExists('store_categories');
    }
};
