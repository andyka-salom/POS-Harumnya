<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * MIGRATION 010 — POS SYSTEM (PRODUCTION READY)
 * Membutuhkan: semua migration 000–008
 *
 * ═══════════════════════════════════════════════════════════
 * ALUR POS:
 *   [1] Kasir login → pilih Variant
 *   [2] Pilih Intensity → load ukuran dari intensity_size_prices
 *   [3] Pilih Size → harga otomatis tampil
 *   [4] Add to cart → carts (+ cart_packagings opsional)
 *   [5] Input customer & sales person (opsional)
 *   [6] Terapkan diskon (opsional) → cart_discounts
 *   [7] Input pembayaran → cart_payments (split payment OK)
 *   [8] Checkout → buat sale + sale_items + sale_payments
 *                → deduct stok via stock_movements
 * ═══════════════════════════════════════════════════════════
 *
 * PERUBAHAN DARI VERSI LAMA:
 *   [1] sale_items.product_id: NOT NULL → NULLABLE
 *       → Sistem made-to-order: produk bisa belum di-generate
 *   [2] sale_items.product_id FK: restrict → nullOnDelete
 *       → Produk boleh dihapus; history transaksi tetap ada
 *   [3] sale_payments.payment_method_name: nullable → NOT NULL
 *       → Wajib diisi sebagai snapshot historis
 *   [4] discount_usages FK ditambahkan:
 *       customer_id → customers (BUKAN users!)
 *       order_id    → sales
 *   [5] SEMUA kolom harga: unsignedBigInteger → decimal(15,2)
 *       → Support Rp 12.000,59
 *   [6] gross_profit di sales & sale_items: SIGNED decimal
 *       → Bisa negatif jika HPP > harga jual
 *   [7] Tambah snapshot variant_id/intensity_id/size_id di sale_items
 *       → Laporan historis tanpa JOIN ke tabel master
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── PAYMENT METHODS ────────────────────────────────────────────────────
        if (! Schema::hasTable('payment_methods')) {
            Schema::create('payment_methods', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('code', 50)->unique();
                $table->string('name', 100);
                $table->enum('type', [
                    'cash', 'card', 'transfer', 'qris', 'ewallet', 'other',
                ])->default('cash');

                $table->boolean('has_admin_fee')->default(false);
                // ★ decimal(5,2) → MDR bisa 0,70%
                $table->decimal('admin_fee_pct', 5, 2)->default(0)
                      ->comment('% biaya admin, contoh: 0,70 untuk QRIS MDR 0.7%');
                $table->boolean('can_give_change')->default(false)
                      ->comment('Hanya cash = true; QRIS/transfer = false');

                $table->boolean('is_active')->default(true);
                $table->unsignedTinyInteger('sort_order')->default(0);
                $table->timestamps();

                $table->index(['is_active', 'sort_order'], 'idx_pm_active_sort');
                $table->index('type');
            });
        }

        // ── CUSTOMERS ─────────────────────────────────────────────────────────
        if (! Schema::hasTable('customers')) {
            Schema::create('customers', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('code', 50)->unique();
                $table->string('name', 255);
                $table->string('phone', 20)->nullable()->unique()
                      ->comment('Dipakai untuk lookup member cepat di POS');
                $table->string('email', 100)->nullable();
                $table->text('address')->nullable();
                $table->date('birth_date')->nullable();
                $table->enum('gender', ['male', 'female', 'other'])->nullable();

                // Loyalty — poin tetap integer (tidak ada poin 0,5)
                $table->unsignedInteger('points')->default(0)
                      ->comment('Saldo poin aktif saat ini');
                $table->unsignedBigInteger('lifetime_points_earned')->default(0)
                      ->comment('[Denorm] Total poin sepanjang masa');
                // ★ decimal(15,2) — lifetime spending support desimal
                $table->decimal('lifetime_spending', 15, 2)->default(0)
                      ->comment('[Denorm] Total belanja (rupiah, 2 desimal) sepanjang masa');
                $table->unsignedInteger('total_transactions')->default(0)
                      ->comment('[Denorm] Total jumlah transaksi');

                $table->enum('tier', ['bronze', 'silver', 'gold', 'platinum'])
                      ->default('bronze');
                $table->boolean('is_active')->default(true);
                $table->timestamp('registered_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['phone', 'is_active'], 'idx_cust_phone_active');
                $table->index(['name', 'is_active'], 'idx_cust_name_active');
                $table->index('tier');
                $table->index('is_active');
            });
        }

        // ── CUSTOMER POINT LEDGERS ─────────────────────────────────────────────
        if (! Schema::hasTable('customer_point_ledgers')) {
            Schema::create('customer_point_ledgers', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('customer_id');
                $table->enum('type', ['earned', 'redeemed', 'expired', 'adjusted']);
                // Poin selalu integer
                $table->integer('points')
                      ->comment('Positif = masuk, negatif = keluar');
                $table->unsignedInteger('balance_after')
                      ->comment('Saldo poin setelah transaksi ini (snapshot)');

                $table->string('reference_type', 100)->nullable()
                      ->comment('Polimorfik: App\\Models\\Sale, App\\Models\\Adjustment');
                $table->uuid('reference_id')->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('expired_at')->nullable();
                $table->foreignId('created_by')->nullable()
                      ->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->foreign('customer_id')
                      ->references('id')->on('customers')->cascadeOnDelete();

                $table->index(['customer_id', 'created_at'], 'idx_cpl_timeline');
                $table->index(['customer_id', 'type'], 'idx_cpl_type');
                $table->index(['reference_type', 'reference_id'], 'idx_cpl_ref');
                $table->index('expired_at');
            });
        }

        // ── CARTS ─────────────────────────────────────────────────────────────
        if (! Schema::hasTable('carts')) {
            Schema::create('carts', function (Blueprint $table) {
                $table->uuid('id')->primary();

                // cashier_id = users.id (bigint)
                $table->foreignId('cashier_id')
                      ->constrained('users')->cascadeOnDelete();
                $table->uuid('store_id');
                $table->uuid('variant_id');
                $table->uuid('intensity_id');
                $table->uuid('size_id');
                $table->uuid('product_id')->nullable()
                      ->comment('null jika kombinasi belum ada di products (made-to-order)');

                // ★ decimal(15,2) — harga cart support desimal
                $table->decimal('unit_price', 15, 2)->default(0)
                      ->comment('Harga satuan parfum (rupiah, 2 desimal) saat ditambah ke cart');
                $table->unsignedSmallInteger('qty')->default(1);

                $table->uuid('customer_id')->nullable();
                $table->uuid('sales_person_id')->nullable();

                // Hold / Parkir cart
                $table->char('hold_id', 36)->nullable()
                      ->comment('null = cart aktif; FILLED = diparkir (UUID sesi hold)');
                $table->string('hold_label', 100)->nullable()
                      ->comment('Label parkir, contoh: "Antrian A", "Pelanggan VIP"');
                $table->timestamp('held_at')->nullable();
                $table->timestamp('cart_expires_at')->nullable()
                      ->comment('Auto-expire: held_at + 2 jam; cleanup via scheduler');

                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('store_id')
                      ->references('id')->on('stores')->cascadeOnDelete();
                $table->foreign('variant_id')
                      ->references('id')->on('variants')->cascadeOnDelete();
                $table->foreign('intensity_id')
                      ->references('id')->on('intensities')->cascadeOnDelete();
                $table->foreign('size_id')
                      ->references('id')->on('sizes')->cascadeOnDelete();
                $table->foreign('product_id')
                      ->references('id')->on('products')->nullOnDelete();
                $table->foreign('customer_id')
                      ->references('id')->on('customers')->nullOnDelete();
                $table->foreign('sales_person_id')
                      ->references('id')->on('sales_people')->nullOnDelete();

                $table->index(['cashier_id', 'store_id', 'hold_id'], 'idx_cart_session');
                $table->index(['store_id', 'hold_id'], 'idx_cart_hold');
                $table->index('cart_expires_at');
            });
        }

        // ── CART PACKAGINGS ────────────────────────────────────────────────────
        if (! Schema::hasTable('cart_packagings')) {
            Schema::create('cart_packagings', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('cart_id');
                $table->uuid('packaging_material_id');
                $table->unsignedSmallInteger('qty')->default(1);
                // ★ decimal(15,2)
                $table->decimal('unit_price', 15, 2)->default(0)
                      ->comment('Harga jual packaging (rupiah, snapshot saat ditambah)');
                $table->timestamps();

                $table->foreign('cart_id')
                      ->references('id')->on('carts')->cascadeOnDelete();
                $table->foreign('packaging_material_id')
                      ->references('id')->on('packaging_materials')->restrictOnDelete();

                $table->unique(['cart_id', 'packaging_material_id'], 'uq_cart_packaging');
                $table->index('cart_id');
            });
        }

        // ── CART DISCOUNTS ────────────────────────────────────────────────────
        if (! Schema::hasTable('cart_discounts')) {
            Schema::create('cart_discounts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('cart_id');
                $table->uuid('discount_type_id');
                // ★ decimal(15,2)
                $table->decimal('applied_amount', 15, 2)->default(0)
                      ->comment('Nominal diskon yang akan dipotong saat checkout');
                $table->timestamps();

                $table->foreign('cart_id')
                      ->references('id')->on('carts')->cascadeOnDelete();
                $table->foreign('discount_type_id')
                      ->references('id')->on('discount_types')->restrictOnDelete();

                $table->unique(['cart_id', 'discount_type_id'], 'uq_cart_discount');
                $table->index('cart_id');
            });
        }

        // ── CART PAYMENTS (Buffer Split Payment Sebelum Checkout) ─────────────
        if (! Schema::hasTable('cart_payments')) {
            Schema::create('cart_payments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('cart_id');
                $table->uuid('payment_method_id');
                // ★ decimal(15,2)
                $table->decimal('amount', 15, 2);
                $table->decimal('admin_fee', 15, 2)->default(0);
                $table->string('reference_number', 100)->nullable();
                $table->timestamps();

                $table->foreign('cart_id')
                      ->references('id')->on('carts')->cascadeOnDelete();
                $table->foreign('payment_method_id')
                      ->references('id')->on('payment_methods')->restrictOnDelete();

                $table->index('cart_id');
            });
        }

        // ── SALES (Header Transaksi Final) ─────────────────────────────────────
        if (! Schema::hasTable('sales')) {
            Schema::create('sales', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('sale_number', 30)->unique()
                      ->comment('Format: INV/YYYYMMDD/XXXXX');

                $table->uuid('store_id');

                // Kasir — users.id (bigint)
                $table->foreignId('cashier_id')->nullable()
                      ->constrained('users')->nullOnDelete();
                $table->string('cashier_name', 255)->nullable()
                      ->comment('Snapshot nama kasir saat transaksi');

                // Sales person — UUID
                $table->uuid('sales_person_id')->nullable();
                $table->string('sales_person_name', 255)->nullable()
                      ->comment('Snapshot nama sales person');

                // Customer — UUID
                $table->uuid('customer_id')->nullable();
                $table->string('customer_name', 255)->nullable()
                      ->comment('Snapshot nama customer');

                $table->timestamp('sold_at')
                      ->comment('Waktu checkout selesai');

                // ★ Revenue — decimal(15,2) → support Rp 85.000,59
                $table->decimal('subtotal_perfume', 15, 2)->default(0);
                $table->decimal('subtotal_packaging', 15, 2)->default(0);
                $table->decimal('subtotal', 15, 2)->default(0)
                      ->comment('subtotal_perfume + subtotal_packaging');
                $table->decimal('discount_amount', 15, 2)->default(0);
                $table->decimal('tax_amount', 15, 2)->default(0);
                $table->decimal('total', 15, 2)->default(0)
                      ->comment('subtotal - discount_amount + tax_amount');

                $table->decimal('amount_paid', 15, 2)->default(0);
                $table->decimal('change_amount', 15, 2)->default(0);

                // ★ HPP — decimal(15,2)
                $table->decimal('cogs_perfume', 15, 2)->default(0);
                $table->decimal('cogs_packaging', 15, 2)->default(0);
                $table->decimal('cogs_total', 15, 2)->default(0);

                // ★ Margin — SIGNED (bisa negatif)
                $table->decimal('gross_profit', 15, 2)->default(0)
                      ->comment('total - cogs_total (bisa negatif)');
                $table->decimal('gross_margin_pct', 6, 2)->default(0);

                // Loyalty
                $table->unsignedInteger('points_earned')->default(0);
                $table->unsignedInteger('points_redeemed')->default(0);
                $table->decimal('points_redemption_value', 15, 2)->default(0);

                $table->enum('status', [
                    'draft', 'completed', 'cancelled', 'refunded',
                ])->default('completed');
                $table->text('notes')->nullable();
                $table->text('cancellation_reason')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->foreignId('cancelled_by')->nullable()
                      ->constrained('users')->nullOnDelete();

                $table->timestamps();
                $table->softDeletes();

                $table->foreign('store_id')
                      ->references('id')->on('stores')->restrictOnDelete();
                $table->foreign('customer_id')
                      ->references('id')->on('customers')->nullOnDelete();
                $table->foreign('sales_person_id')
                      ->references('id')->on('sales_people')->nullOnDelete();

                // ★ Index komprehensif untuk dashboard & laporan
                $table->index(['store_id', 'sold_at', 'status'],  'idx_sales_store_date_status');
                $table->index(['sold_at', 'status'],              'idx_sales_date_status');
                $table->index(['cashier_id', 'sold_at'],          'idx_sales_cashier_date');
                $table->index(['customer_id', 'sold_at'],         'idx_sales_customer_date');
                $table->index(['sales_person_id', 'sold_at'],     'idx_sales_sp_date');
                $table->index('sold_at');
                $table->index('status');
            });
        }

        // ── SALE ITEMS ─────────────────────────────────────────────────────────
        if (! Schema::hasTable('sale_items')) {
            Schema::create('sale_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('sale_id');

                // ★ FIX KRITIS: NULLABLE — made-to-order, produk belum tentu di-generate
                $table->uuid('product_id')->nullable()
                      ->comment('null jika kombinasi belum ada di products table');

                // Snapshot historis — tidak berubah meski produk di-rename/hapus
                $table->string('product_name', 255);
                $table->string('product_sku', 100)->nullable();
                $table->string('variant_name', 255)->nullable();
                $table->string('intensity_code', 20)->nullable();
                $table->unsignedSmallInteger('size_ml')->nullable();

                // ★ Snapshot ID untuk laporan historis tanpa JOIN ke master
                $table->uuid('variant_id_snapshot')->nullable()
                      ->comment('Snapshot variant_id untuk laporan historis');
                $table->uuid('intensity_id_snapshot')->nullable()
                      ->comment('Snapshot intensity_id untuk laporan historis');
                $table->uuid('size_id_snapshot')->nullable()
                      ->comment('Snapshot size_id untuk laporan historis');

                $table->unsignedSmallInteger('qty')->default(1);

                // ★ decimal(15,2) — harga support Rp 85.000,59
                $table->decimal('unit_price', 15, 2)
                      ->comment('Harga jual satuan saat transaksi');
                $table->decimal('item_discount', 15, 2)->default(0);
                $table->decimal('subtotal', 15, 2);

                // HPP snapshot
                $table->decimal('cogs_per_unit', 15, 2)->default(0);
                $table->decimal('cogs_total', 15, 2)->default(0);
                // ★ SIGNED — gross profit bisa negatif
                $table->decimal('line_gross_profit', 15, 2)->default(0);
                $table->decimal('line_gross_margin_pct', 6, 2)->default(0);

                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('sale_id')
                      ->references('id')->on('sales')->cascadeOnDelete();
                // ★ FIX: nullOnDelete — produk boleh dihapus, history tetap ada
                $table->foreign('product_id')
                      ->references('id')->on('products')->nullOnDelete();

                $table->index('sale_id');
                $table->index(['product_id', 'created_at'], 'idx_si_product_date');
                $table->index('variant_id_snapshot');
                $table->index('intensity_id_snapshot');
            });
        }

        // ── SALE ITEM PACKAGINGS ───────────────────────────────────────────────
        if (! Schema::hasTable('sale_item_packagings')) {
            Schema::create('sale_item_packagings', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('sale_item_id');
                $table->uuid('packaging_material_id')->nullable()
                      ->comment('Nullable: packaging boleh dihapus, history tetap ada');

                // Snapshot historis
                $table->string('packaging_name', 255);
                $table->string('packaging_code', 100)->nullable();

                $table->unsignedSmallInteger('qty')->default(1);
                // ★ decimal(15,2)
                $table->decimal('unit_price', 15, 2)->default(0);
                $table->decimal('subtotal', 15, 2)->default(0);

                $table->decimal('unit_cost', 15, 4)->default(0)
                      ->comment('WAC packaging saat transaksi (snapshot)');
                $table->decimal('cogs_total', 15, 2)->default(0);
                $table->decimal('line_gross_profit', 15, 2)->default(0);
                $table->decimal('line_gross_margin_pct', 6, 2)->default(0);

                $table->timestamps();

                $table->foreign('sale_item_id')
                      ->references('id')->on('sale_items')->cascadeOnDelete();
                $table->foreign('packaging_material_id')
                      ->references('id')->on('packaging_materials')->nullOnDelete();

                $table->index('sale_item_id');
                $table->index('packaging_material_id');
            });
        }

        // ── SALE DISCOUNTS ─────────────────────────────────────────────────────
        if (! Schema::hasTable('sale_discounts')) {
            Schema::create('sale_discounts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('sale_id');
                $table->uuid('discount_type_id')->nullable()
                      ->comment('null = diskon manual oleh kasir');

                $table->string('discount_code', 50)->nullable();
                $table->string('discount_name', 255)
                      ->comment('Snapshot nama diskon');
                $table->enum('discount_category', [
                    'percentage', 'fixed_amount', 'buy_x_get_y',
                    'free_product', 'game_reward', 'bundle', 'manual',
                ])->default('percentage');

                $table->decimal('discount_value', 15, 2)->default(0)
                      ->comment('Nilai rule saat transaksi (% atau rupiah, referensi historis)');
                // ★ decimal(15,2)
                $table->decimal('applied_amount', 15, 2)
                      ->comment('Nominal rupiah yang benar-benar dipotong');
                $table->unsignedTinyInteger('sort_order')->default(0);

                $table->json('applied_to_items')->nullable();
                $table->json('reward_items')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('sale_id')
                      ->references('id')->on('sales')->cascadeOnDelete();
                $table->foreign('discount_type_id')
                      ->references('id')->on('discount_types')->nullOnDelete();

                $table->index('sale_id');
                $table->index('discount_type_id');
            });
        }

        // ── SALE PAYMENTS ──────────────────────────────────────────────────────
        if (! Schema::hasTable('sale_payments')) {
            Schema::create('sale_payments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('sale_id');
                $table->uuid('payment_method_id')->nullable()
                      ->comment('Nullable: payment method boleh dihapus, history tetap ada');

                // ★ decimal(15,2)
                $table->decimal('amount', 15, 2);
                $table->decimal('admin_fee', 15, 2)->default(0);

                // ★ FIX: NOT NULL — wajib diisi saat checkout sebagai snapshot historis
                $table->string('payment_method_name', 100)
                      ->comment('Snapshot: "QRIS BCA", "Cash", "Transfer Mandiri"');
                $table->string('payment_method_type', 50)
                      ->comment('Snapshot: cash|card|transfer|qris|ewallet|other');

                $table->string('reference_number', 100)->nullable();

                $table->enum('payment_status', [
                    'pending', 'completed', 'failed', 'voided',
                ])->default('completed');

                $table->timestamp('settled_at')->nullable()
                      ->comment('Cash/QRIS: diisi = sold_at; Transfer manual: saat dikonfirmasi');

                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('sale_id')
                      ->references('id')->on('sales')->cascadeOnDelete();
                $table->foreign('payment_method_id')
                      ->references('id')->on('payment_methods')->nullOnDelete();

                $table->index('sale_id');
                $table->index(
                    ['payment_method_type', 'payment_status', 'settled_at'],
                    'idx_sp_type_status_date'
                );
            });
        }

        // ── SALE RETURNS ───────────────────────────────────────────────────────
        if (! Schema::hasTable('sale_returns')) {
            Schema::create('sale_returns', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('return_number', 30)->unique();
                $table->uuid('sale_id');
                $table->uuid('store_id');

                $table->foreignId('cashier_id')->nullable()
                      ->constrained('users')->nullOnDelete();

                $table->timestamp('returned_at');
                $table->enum('return_type', ['refund', 'exchange'])->default('refund');

                // ★ decimal(15,2)
                $table->decimal('total_refund', 15, 2)->default(0);
                $table->enum('refund_method', [
                    'cash', 'store_credit', 'original_payment',
                ])->default('original_payment');

                $table->text('reason')->nullable();
                $table->enum('status', [
                    'pending', 'approved', 'rejected', 'completed',
                ])->default('pending');

                $table->timestamps();

                $table->foreign('sale_id')
                      ->references('id')->on('sales')->restrictOnDelete();
                $table->foreign('store_id')
                      ->references('id')->on('stores')->restrictOnDelete();

                $table->index(['sale_id', 'status']);
                $table->index('returned_at');
            });
        }

        if (! Schema::hasTable('sale_return_items')) {
            Schema::create('sale_return_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('sale_return_id');
                $table->uuid('sale_item_id');

                $table->unsignedSmallInteger('qty_returned');
                // ★ decimal(15,2)
                $table->decimal('refund_amount', 15, 2);
                $table->text('reason')->nullable();
                $table->timestamps();

                $table->foreign('sale_return_id')
                      ->references('id')->on('sale_returns')->cascadeOnDelete();
                $table->foreign('sale_item_id')
                      ->references('id')->on('sale_items')->restrictOnDelete();

                $table->index('sale_return_id');
                $table->index('sale_item_id');
            });
        }

        // ── FK TERTUNDA ────────────────────────────────────────────────────────

        // ★ BUG FIX: discount_usages.customer_id → customers (BUKAN users!)
        $this->addFkIfMissing(
            'discount_usages',
            'discount_usages_customer_id_foreign',
            fn ($t) => $t->foreign('customer_id')
                         ->references('id')->on('customers')->nullOnDelete()
        );

        // discount_usages.order_id → sales
        $this->addFkIfMissing(
            'discount_usages',
            'discount_usages_order_id_foreign',
            fn ($t) => $t->foreign('order_id')
                         ->references('id')->on('sales')->nullOnDelete()
        );
    }

    public function down(): void
    {
        // Lepas FK tertunda
        if (Schema::hasTable('discount_usages')) {
            Schema::table('discount_usages', function (Blueprint $table) {
                $this->dropFkIfExists($table, 'discount_usages_customer_id_foreign');
                $this->dropFkIfExists($table, 'discount_usages_order_id_foreign');
            });
        }

        Schema::dropIfExists('sale_return_items');
        Schema::dropIfExists('sale_returns');
        Schema::dropIfExists('sale_payments');
        Schema::dropIfExists('sale_discounts');
        Schema::dropIfExists('sale_item_packagings');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('cart_payments');
        Schema::dropIfExists('cart_discounts');
        Schema::dropIfExists('cart_packagings');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('customer_point_ledgers');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('payment_methods');
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function addFkIfMissing(string $table, string $fkName, callable $callback): void
    {
        if (! Schema::hasTable($table)) return;

        if (! in_array($fkName, $this->listFks($table))) {
            Schema::table($table, $callback);
        }
    }

    private function dropFkIfExists(Blueprint $table, string $fkName): void
    {
        if (in_array($fkName, $this->listFks($table->getTable()))) {
            $table->dropForeign($fkName);
        }
    }

    private function listFks(string $table): array
    {
        if (! Schema::hasTable($table)) return [];

        $driver = Schema::getConnection()->getDriverName();

        $rows = ($driver === 'pgsql')
            ? DB::select(
                "SELECT conname FROM pg_constraint
                 WHERE conrelid = ?::regclass AND contype = 'f'",
                [$table]
              )
            : DB::select(
                "SELECT CONSTRAINT_NAME AS conname
                 FROM information_schema.TABLE_CONSTRAINTS
                 WHERE TABLE_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                   AND TABLE_SCHEMA = DATABASE()",
                [$table]
              );

        return array_column($rows, 'conname');
    }
};
