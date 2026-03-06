<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;

/**
 * PosStoreMiddleware
 *
 * Inject active_store ke dalam request berdasarkan:
 *   1. Header X-Store-ID  (diset saat kasir login & pilih toko)
 *   2. Fallback ke users.default_store_id
 *
 * Daftarkan di bootstrap/app.php:
 *   $middleware->alias(['pos.store' => PosStoreMiddleware::class]);
 *
 * Dipakai di routes/api.php:
 *   Route::middleware(['auth:sanctum', 'pos.store'])->prefix('pos')...
 */
class PosStoreMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Priority: header X-Store-ID > default_store_id user
        $storeId = $request->header('X-Store-ID') ?? $user?->default_store_id;

        if (! $storeId) {
            return response()->json([
                'success' => false,
                'message' => 'Store belum dipilih. Set header X-Store-ID atau atur default store di profil.',
                'data'    => null,
            ], 422);
        }

        $store = Store::where('id', $storeId)
            ->where('is_active', true)
            ->first();

        if (! $store) {
            return response()->json([
                'success' => false,
                'message' => 'Store tidak ditemukan atau tidak aktif.',
                'data'    => null,
            ], 404);
        }

        // Inject ke request attributes agar semua controller bisa akses via:
        //   $store = $request->attributes->get('active_store');
        $request->attributes->set('active_store', $store);

        return $next($request);
    }
}
