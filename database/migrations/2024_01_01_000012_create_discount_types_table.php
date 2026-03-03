<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MIGRATION 008 — DISCOUNT SYSTEM
 * Membutuhkan: variants, intensities, sizes (004), stores (000)
 *
 * PERUBAHAN DARI VERSI LAMA:
 *   discount_types.min_purchase_amount  : unsignedBigInteger → decimal(15,2)
 *   discount_types.max_discount_amount  : unsignedBigInteger → decimal(15,2)
 *   discount_rewards.fixed_price        : unsignedBigInteger → decimal(15,2)
 *   discount_reward_pools.fixed_price   : decimal(15,2) ✓ sudah benar
 *   discount_usages.discount_amount / original_amount / final_amount :
 *     decimal(15,2) ✓ sudah benar
 *
 * BUG FIX KRITIS:
 *   discount_usages.customer_id: FK ke customers (BUKAN users!)
 *   → FK constraint ditambahkan di migration 010 setelah tabel customers dibuat
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── DISCOUNT TYPES ────────────────────────────────────────────────────
        Schema::create('discount_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 255);

            $table->enum('type', [
                'percentage',
                'fixed_amount',
                'buy_x_get_y',
                'free_product',
                'game_reward',
                'bundle',
            ])->default('percentage');

            // ★ decimal(15,2): bisa 15,50% atau Rp 12.000,50
            $table->decimal('value', 15, 2)->default(0)
                  ->comment('Nilai: angka % (percentage) atau rupiah (fixed_amount)');

            $table->integer('buy_quantity')->nullable()
                  ->comment('Jumlah item yang harus dibeli (X dalam Buy X Get Y)');
            $table->integer('get_quantity')->nullable()
                  ->comment('Jumlah item gratis (Y dalam Buy X Get Y)');

            $table->enum('get_product_type', [
                'same',
                'specific',
                'lower_intensity',
                'choose_from_pool',
                'choose_variant',
            ])->nullable();

            // ★ decimal(15,2) → support Rp 150.000,50
            $table->decimal('min_purchase_amount', 15, 2)->nullable()
                  ->comment('Minimal total belanja agar diskon berlaku (rupiah)');
            $table->unsignedInteger('min_purchase_quantity')->nullable()
                  ->comment('Minimal jumlah item di cart (integer)');
            $table->decimal('max_discount_amount', 15, 2)->nullable()
                  ->comment('Batas maksimal potongan (rupiah)');

            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();

            $table->boolean('is_game_reward')->default(false);
            $table->unsignedTinyInteger('game_probability')->nullable()
                  ->comment('Probabilitas menang (1–100)');
            $table->unsignedTinyInteger('priority')->default(0)
                  ->comment('Prioritas aplikasi: lebih besar = lebih dulu diproses');
            $table->boolean('is_combinable')->default(false)
                  ->comment('Bisa dikombinasi dengan diskon lain dalam 1 transaksi');
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->json('terms_conditions')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'start_date', 'end_date'], 'idx_dt_active_period');
            $table->index(['is_active', 'priority'], 'idx_dt_active_priority');
            $table->index('type');
            $table->index('is_game_reward');
        });

        // ── DISCOUNT APPLICABILITIES ──────────────────────────────────────────
        // Produk mana yang menjadi TARGET diskon ini
        Schema::create('discount_applicabilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('discount_type_id');
            $table->uuid('variant_id')->nullable()->comment('null = semua variant');
            $table->uuid('intensity_id')->nullable()->comment('null = semua intensity');
            $table->uuid('size_id')->nullable()->comment('null = semua ukuran');
            $table->timestamps();

            $table->foreign('discount_type_id')
                  ->references('id')->on('discount_types')->cascadeOnDelete();
            $table->foreign('variant_id')
                  ->references('id')->on('variants')->cascadeOnDelete();
            $table->foreign('intensity_id')
                  ->references('id')->on('intensities')->cascadeOnDelete();
            $table->foreign('size_id')
                  ->references('id')->on('sizes')->cascadeOnDelete();

            $table->index('discount_type_id');
            $table->index('size_id');       // sering filter by size (P50 vs P10)
        });

        // ── DISCOUNT STORES ───────────────────────────────────────────────────
        Schema::create('discount_stores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('discount_type_id');
            $table->uuid('store_id')->nullable()->comment('null = berlaku di semua toko');
            $table->timestamps();

            $table->foreign('discount_type_id')
                  ->references('id')->on('discount_types')->cascadeOnDelete();
            $table->foreign('store_id')
                  ->references('id')->on('stores')->cascadeOnDelete();

            $table->unique(['discount_type_id', 'store_id'], 'uq_discount_store');
            $table->index('discount_type_id');
            $table->index('store_id');
        });

        // ── DISCOUNT REQUIREMENTS ─────────────────────────────────────────────
        // Produk yang HARUS ADA di cart agar diskon berlaku
        Schema::create('discount_requirements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('discount_type_id');
            $table->uuid('variant_id')->nullable();
            $table->uuid('intensity_id')->nullable();
            $table->uuid('size_id')->nullable();
            $table->unsignedSmallInteger('required_quantity')->default(1);
            $table->enum('matching_mode', ['all', 'any'])->default('all');
            $table->string('group_key', 50)->nullable()
                  ->comment('Row group_key sama = OR; beda group_key = AND');
            $table->timestamps();

            $table->foreign('discount_type_id')
                  ->references('id')->on('discount_types')->cascadeOnDelete();
            $table->foreign('variant_id')
                  ->references('id')->on('variants')->cascadeOnDelete();
            $table->foreign('intensity_id')
                  ->references('id')->on('intensities')->cascadeOnDelete();
            $table->foreign('size_id')
                  ->references('id')->on('sizes')->cascadeOnDelete();

            $table->index('discount_type_id');
            $table->index(['discount_type_id', 'group_key'], 'idx_dr_dt_group');
        });

        // ── DISCOUNT REWARDS ──────────────────────────────────────────────────
        Schema::create('discount_rewards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('discount_type_id');
            $table->uuid('variant_id')->nullable();
            $table->uuid('intensity_id')->nullable();
            $table->uuid('size_id')->nullable();

            $table->unsignedSmallInteger('reward_quantity')->default(1);
            $table->boolean('customer_can_choose')->default(false);
            $table->boolean('is_pool')->default(false);
            $table->unsignedTinyInteger('max_choices')->nullable();

            $table->decimal('discount_percentage', 5, 2)->nullable()
                  ->comment('100,00 = gratis; 50,00 = diskon 50%');
            // ★ decimal(15,2)
            $table->decimal('fixed_price', 15, 2)->nullable()
                  ->comment('Override harga reward (0,00 = gratis; support desimal)');

            $table->unsignedTinyInteger('priority')->default(0);
            $table->timestamps();

            $table->foreign('discount_type_id')
                  ->references('id')->on('discount_types')->cascadeOnDelete();
            $table->foreign('variant_id')
                  ->references('id')->on('variants')->cascadeOnDelete();
            $table->foreign('intensity_id')
                  ->references('id')->on('intensities')->cascadeOnDelete();
            $table->foreign('size_id')
                  ->references('id')->on('sizes')->cascadeOnDelete();

            $table->index('discount_type_id');
        });

        // ── DISCOUNT REWARD POOLS ─────────────────────────────────────────────
        Schema::create('discount_reward_pools', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('discount_reward_id');
            $table->uuid('product_id')->nullable();
            $table->uuid('variant_id')->nullable();
            $table->uuid('intensity_id')->nullable();
            $table->uuid('size_id')->nullable();

            $table->string('label', 255);
            $table->string('image_url', 500)->nullable();

            // ★ decimal(15,2)
            $table->decimal('fixed_price', 15, 2)->nullable()
                  ->comment('Override harga item ini (0,00 = gratis; null = ikut discount_rewards)');
            $table->unsignedTinyInteger('probability')->nullable()
                  ->comment('Bobot Plinko (1–100); null = equal weight');

            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('discount_reward_id')
                  ->references('id')->on('discount_rewards')->cascadeOnDelete();
            $table->foreign('product_id')
                  ->references('id')->on('products')->nullOnDelete();
            $table->foreign('variant_id')
                  ->references('id')->on('variants')->nullOnDelete();
            $table->foreign('intensity_id')
                  ->references('id')->on('intensities')->nullOnDelete();
            $table->foreign('size_id')
                  ->references('id')->on('sizes')->nullOnDelete();

            $table->index('discount_reward_id');
            $table->index(['discount_reward_id', 'is_active', 'sort_order'],
                          'idx_drp_active_sort');
        });

        // ── DISCOUNT USAGES ───────────────────────────────────────────────────
        // ★ BUG FIX: customer_id FK ke customers (BUKAN users!)
        //   FK constraint ditambahkan di migration 010 setelah customers dibuat
        Schema::create('discount_usages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('discount_type_id');
            $table->uuid('order_id')->nullable()
                  ->comment('FK ke sales.id — FK constraint ditambah di migration 010');
            $table->uuid('store_id');
            $table->uuid('customer_id')->nullable()
                  ->comment('FK ke customers.id (BUKAN users!) — FK ditambah di migration 010');

            // ★ decimal(15,2) → support Rp 12.000,59
            $table->decimal('discount_amount', 15, 2)
                  ->comment('Nominal diskon yang diberikan (rupiah)');
            $table->decimal('original_amount', 15, 2)
                  ->comment('Total belanja sebelum diskon (rupiah)');
            $table->decimal('final_amount', 15, 2)
                  ->comment('Total belanja setelah diskon (rupiah)');

            $table->json('applied_to_items')->nullable()
                  ->comment('Snapshot JSON: item yang mendapat diskon');
            $table->json('reward_items')->nullable()
                  ->comment('Snapshot JSON: reward yang diberikan');

            $table->boolean('is_game_reward')->default(false);
            $table->string('game_type', 50)->nullable();
            $table->string('game_result', 255)->nullable();
            $table->uuid('chosen_reward_pool_id')->nullable();

            $table->timestamp('used_at');
            $table->timestamps();

            $table->foreign('discount_type_id')
                  ->references('id')->on('discount_types')->restrictOnDelete();
            $table->foreign('store_id')
                  ->references('id')->on('stores')->restrictOnDelete();
            // FK customer_id & order_id ditambahkan di migration 010

            $table->index('discount_type_id');
            $table->index('store_id');
            $table->index('order_id');
            $table->index('customer_id');
            $table->index('used_at');
            $table->index(['discount_type_id', 'used_at'], 'idx_du_dt_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_usages');
        Schema::dropIfExists('discount_reward_pools');
        Schema::dropIfExists('discount_rewards');
        Schema::dropIfExists('discount_requirements');
        Schema::dropIfExists('discount_stores');
        Schema::dropIfExists('discount_applicabilities');
        Schema::dropIfExists('discount_types');
    }
};
