<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MIGRATION: SALES PEOPLE & TARGETS
     */
    public function up(): void
    {
        Schema::create('sales_people', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_id');
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->string('phone', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->date('join_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('store_id')
                  ->references('id')->on('stores')
                  ->onDelete('cascade');

            $table->index(['store_id', 'is_active']);
        });

        Schema::create('sales_targets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('sales_person_id');
            $table->integer('year');
            $table->integer('month');
            $table->unsignedBigInteger('target_amount')->nullable()
                  ->comment('Target omzet (rupiah)');
            $table->unsignedInteger('target_quantity')->nullable()
                  ->comment('Target unit terjual');
            $table->timestamps();

            $table->foreign('sales_person_id')
                  ->references('id')->on('sales_people')
                  ->onDelete('cascade');

            $table->unique(['sales_person_id', 'year', 'month']);
            $table->index(['year', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_targets');
        Schema::dropIfExists('sales_people');
    }
};
