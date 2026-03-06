<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\POS\CatalogController;
use App\Http\Controllers\Api\POS\CartController;
use App\Http\Controllers\Api\POS\CheckoutController;
use App\Http\Controllers\Api\POS\CustomerController;
use App\Http\Controllers\Api\POS\DiscountController;
use App\Http\Controllers\Api\POS\SaleController;
use App\Http\Controllers\Api\POS\StockController;
use App\Http\Controllers\Api\POS\ShiftController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | AUTH — Public
    |--------------------------------------------------------------------------
    */
    Route::prefix('auth')->group(function () {
        Route::post('login',   [AuthController::class, 'login']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });

    /*
    |--------------------------------------------------------------------------
    | AUTH — Protected
    |--------------------------------------------------------------------------
    */
    Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
        Route::get('me',          [AuthController::class, 'me']);
        Route::post('logout',     [AuthController::class, 'logout']);
        Route::post('logout-all', [AuthController::class, 'logoutAll']);
    });

    /*
    |--------------------------------------------------------------------------
    | POS — Protected + Store Injection
    |
    | Semua route di bawah memerlukan:
    |   1. Bearer Token (auth:sanctum)
    |   2. Header X-Store-ID  →  di-inject oleh middleware pos.store
    |
    | Base URL: /api/v1/pos/...
    |--------------------------------------------------------------------------
    */
    Route::middleware(['auth:sanctum', 'pos.store'])->prefix('pos')->group(function () {

        /*
        |----------------------------------------------------------------------
        | CATALOG — Intensities → Variants → Sizes → Packaging
        |----------------------------------------------------------------------
        */
        Route::prefix('catalog')->group(function () {
            // [1] GET /api/v1/pos/catalog/intensities
            Route::get('intensities', [CatalogController::class, 'intensities']);

            // [2] GET /api/v1/pos/catalog/intensities/{intensity}/variants
            Route::get('intensities/{intensity}/variants', [CatalogController::class, 'variants']);

            // [3] GET /api/v1/pos/catalog/intensities/{intensity}/variants/{variant}/sizes
            Route::get('intensities/{intensity}/variants/{variant}/sizes', [CatalogController::class, 'sizes']);

            // [4] GET /api/v1/pos/catalog/packaging
            Route::get('packaging', [CatalogController::class, 'packaging']);
        });

        /*
        |----------------------------------------------------------------------
        | CART — Kelola cart aktif & cart parkir
        |----------------------------------------------------------------------
        */
        Route::prefix('cart')->group(function () {
            Route::get('/',    [CartController::class, 'index']);    // List cart aktif + diparkir
            Route::post('/',   [CartController::class, 'store']);    // Buat cart baru
            Route::get('{cart}',    [CartController::class, 'show']);    // Detail cart
            Route::delete('{cart}', [CartController::class, 'destroy']); // Hapus cart

            Route::put('{cart}/customer',     [CartController::class, 'setCustomer']);    // Set customer
            Route::put('{cart}/sales-person', [CartController::class, 'setSalesPerson']); // Set sales person

            Route::post('{cart}/hold',   [CartController::class, 'hold']);   // Parkir cart
            Route::post('{cart}/resume', [CartController::class, 'resume']); // Resume cart

            Route::post('{cart}/packaging',             [CartController::class, 'addPackaging']);    // Tambah packaging
            Route::delete('{cart}/packaging/{packaging}', [CartController::class, 'removePackaging']); // Hapus packaging

            Route::post('{cart}/payments',          [CartController::class, 'addPayment']);    // Tambah payment buffer
            Route::delete('{cart}/payments/{payment}', [CartController::class, 'removePayment']); // Hapus payment buffer
        });

        /*
        |----------------------------------------------------------------------
        | DISCOUNT — Cek eligibility & terapkan diskon
        |----------------------------------------------------------------------
        */
        Route::prefix('discounts')->group(function () {
            Route::post('check',        [DiscountController::class, 'check']);        // Cek diskon eligible
            Route::post('apply',        [DiscountController::class, 'apply']);        // Terapkan diskon
            Route::delete('{cartDiscount}', [DiscountController::class, 'remove']);   // Lepas diskon

            Route::post('game/spin',    [DiscountController::class, 'spin']);         // Trigger game
            Route::post('game/choose',  [DiscountController::class, 'chooseReward']); // Pilih reward
        });

        /*
        |----------------------------------------------------------------------
        | CHECKOUT — Finalisasi transaksi
        |----------------------------------------------------------------------
        */
        Route::post('checkout',               [CheckoutController::class, 'checkout']);    // Proses checkout
        Route::get('checkout/{sale}/receipt', [CheckoutController::class, 'receipt']);     // Data struk
        Route::get('payment-methods',         [CheckoutController::class, 'paymentMethods']); // Metode bayar

        /*
        |----------------------------------------------------------------------
        | SALES — Riwayat & Retur
        |----------------------------------------------------------------------
        */
        Route::prefix('sales')->group(function () {
            Route::get('/',                          [SaleController::class, 'index']);        // List transaksi
            Route::get('{sale}',                     [SaleController::class, 'show']);         // Detail transaksi
            Route::post('{sale}/return',             [SaleController::class, 'createReturn']); // Buat retur
            Route::get('{sale}/return/{saleReturn}', [SaleController::class, 'showReturn']);   // Status retur
        });

        /*
        |----------------------------------------------------------------------
        | CUSTOMER — Lookup & Loyalty
        |----------------------------------------------------------------------
        */
        Route::prefix('customers')->group(function () {
            Route::get('/',                          [CustomerController::class, 'search']);       // Cari customer
            Route::post('/',                         [CustomerController::class, 'store']);        // Register baru
            Route::get('{customer}',                 [CustomerController::class, 'show']);         // Detail customer
            Route::get('{customer}/transactions',    [CustomerController::class, 'transactions']); // Riwayat transaksi
            Route::get('{customer}/points',          [CustomerController::class, 'pointLedger']); // Ledger poin
        });

        /*
        |----------------------------------------------------------------------
        | STOCK — Cek stok (read-only untuk kasir)
        |----------------------------------------------------------------------
        */
        Route::prefix('stock')->group(function () {
            Route::get('ingredients', [StockController::class, 'ingredients']); // Stok bahan
            Route::get('packaging',   [StockController::class, 'packaging']);   // Stok packaging
            Route::get('low',         [StockController::class, 'lowStock']);    // Alert stok rendah
        });

        /*
        |----------------------------------------------------------------------
        | SHIFT — Ringkasan kasir hari ini
        |----------------------------------------------------------------------
        */
        Route::prefix('shift')->group(function () {
            Route::get('summary',           [ShiftController::class, 'summary']);          // Summary omzet
            Route::get('payment-breakdown', [ShiftController::class, 'paymentBreakdown']); // Breakdown per metode
        });

    }); // end POS group

}); // end v1
