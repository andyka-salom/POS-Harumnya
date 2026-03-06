<?php

namespace App\Http\Controllers\Api\POS;

use App\Http\Controllers\Controller;
use App\Models\Intensity;
use App\Models\Variant;
use App\Models\IntensitySizePrice;
use App\Models\IntensitySizeQuantity;
use App\Models\PackagingMaterial;
use App\Models\StoreCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CatalogController
 *
 * Alur POS:
 *   [1] GET /catalog/intensities          → Pilih intensity (EDT / EDP / EXT)
 *   [2] GET /catalog/intensities/{id}/variants  → Pilih variant (filter by store category)
 *   [3] GET /catalog/intensities/{id}/variants/{id}/sizes → Pilih ukuran + harga
 *   [4] GET /catalog/packaging             → Add-on packaging
 */
class CatalogController extends Controller
{
    /**
     * [1] GET /pos/catalog/intensities
     *
     * Kembalikan semua intensitas aktif, diurutkan berdasarkan sort_order.
     * Intensitas yang tidak memiliki kombinasi harga aktif di-exclude.
     */
    public function intensities(Request $request): JsonResponse
    {
        $intensities = Intensity::query()
            ->where('is_active', true)
            // Hanya tampilkan intensity yang punya harga aktif
            ->whereHas('intensitySizePrices', fn ($q) => $q->where('is_active', true))
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'oil_ratio', 'alcohol_ratio', 'sort_order']);

        return response()->json([
            'data' => $intensities,
        ]);
    }

    /**
     * [2] GET /pos/catalog/intensities/{intensity}/variants
     *
     * Kembalikan daftar variant aktif untuk intensity tertentu,
     * difilter berdasarkan store_category (whitelist variant per kategori toko).
     *
     * Logic:
     *   - Jika store tidak punya store_category → tampilkan semua variant
     *   - Jika store_category.allow_all_variants = true → tampilkan semua variant
     *   - Jika ada whitelist (store_category_variants) → filter sesuai whitelist
     */
    public function variants(Request $request, Intensity $intensity): JsonResponse
    {
        $store = $request->attributes->get('active_store'); // di-inject oleh middleware pos.store

        // Tentukan variant ID yang diizinkan untuk store ini
        $allowedVariantIds = $this->getAllowedVariantIds($store);

        $query = Variant::query()
            ->where('is_active', true)
            // Hanya variant yang punya resep untuk intensity ini
            ->whereHas('variantRecipes', fn ($q) => $q->where('intensity_id', $intensity->id))
            ->orderBy('sort_order');

        if ($allowedVariantIds !== null) {
            $query->whereIn('id', $allowedVariantIds);
        }

        $variants = $query->get(['id', 'code', 'name', 'gender', 'description', 'image', 'sort_order']);

        return response()->json([
            'data'      => $variants,
            'intensity' => $intensity->only('id', 'code', 'name'),
        ]);
    }

    /**
     * [3] GET /pos/catalog/intensities/{intensity}/variants/{variant}/sizes
     *
     * Kembalikan daftar ukuran yang tersedia untuk kombinasi intensity+variant,
     * lengkap dengan harga jual dari intensity_size_prices.
     *
     * Juga sertakan ketersediaan stok (dari store_ingredient_stocks) agar
     * kasir bisa tahu apakah stok bahan cukup untuk membuat parfum ukuran ini.
     */
    public function sizes(Request $request, Intensity $intensity, Variant $variant): JsonResponse
    {
        $store = $request->attributes->get('active_store');

        // Ambil semua kombinasi intensity+size yang aktif dan punya harga
        $prices = IntensitySizePrice::query()
            ->with('size:id,volume_ml,name,sort_order')
            ->where('intensity_id', $intensity->id)
            ->where('is_active', true)
            ->get();

        // Ambil quantities untuk scaling stok check
        $quantities = IntensitySizeQuantity::query()
            ->where('intensity_id', $intensity->id)
            ->where('is_active', true)
            ->get()
            ->keyBy('size_id');

        // Cek stok bahan di store untuk variant+intensity ini
        $stockMap = $this->buildStockSufficiencyMap($store->id, $variant->id, $intensity->id, $quantities);

        $sizes = $prices->map(function ($isp) use ($quantities, $stockMap) {
            $qty = $quantities->get($isp->size_id);

            return [
                'size_id'          => $isp->size_id,
                'volume_ml'        => $isp->size->volume_ml,
                'size_name'        => $isp->size->name,
                'sort_order'       => $isp->size->sort_order,
                'price'            => $isp->price,
                'price_formatted'  => 'Rp ' . number_format($isp->price, 0, ',', '.'),
                'oil_quantity'     => $qty?->oil_quantity,
                'alcohol_quantity' => $qty?->alcohol_quantity,
                'total_volume'     => $qty?->total_volume,
                'stock_sufficient' => $stockMap[$isp->size_id] ?? null, // true/false/null
            ];
        })->sortBy('sort_order')->values();

        return response()->json([
            'data'      => $sizes,
            'intensity' => $intensity->only('id', 'code', 'name'),
            'variant'   => $variant->only('id', 'code', 'name'),
        ]);
    }

    /**
     * [4] GET /pos/catalog/packaging
     *
     * Daftar packaging material yang aktif & tersedia sebagai add-on di POS.
     *
     * Query params:
     *   - size_id (opsional): filter packaging untuk ukuran botol tertentu
     */
    public function packaging(Request $request): JsonResponse
    {
        $store = $request->attributes->get('active_store');

        $query = PackagingMaterial::query()
            ->with('packagingCategory:id,name')
            ->where('is_active', true)
            ->where('is_available_as_addon', true)
            ->orderBy('sort_order');

        // Filter by size jika ada (untuk botol, tutup, dll yang size-specific)
        if ($request->filled('size_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('size_id', $request->size_id)
                  ->orWhereNull('size_id'); // packaging universal (box, paper bag, dll)
            });
        }

        $packaging = $query->get([
            'id', 'packaging_category_id', 'size_id',
            'code', 'name', 'unit', 'image',
            'selling_price', 'is_available_as_addon', 'sort_order',
        ]);

        // Group by category untuk kemudahan display di mobile
        $grouped = $packaging->groupBy('packagingCategory.name')->map(function ($items, $category) {
            return [
                'category' => $category,
                'items'    => $items->map(fn ($item) => [
                    'id'              => $item->id,
                    'code'            => $item->code,
                    'name'            => $item->name,
                    'unit'            => $item->unit,
                    'image'           => $item->image,
                    'size_id'         => $item->size_id,
                    'selling_price'   => $item->selling_price,
                    'price_formatted' => 'Rp ' . number_format($item->selling_price, 0, ',', '.'),
                    'sort_order'      => $item->sort_order,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'data' => $grouped,
        ]);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    /**
     * Kembalikan array variant_id yang boleh dijual di store ini.
     * null = semua variant diizinkan (tidak ada whitelist).
     */
    private function getAllowedVariantIds($store): ?array
    {
        if (! $store->store_category_id) {
            return null; // Tidak ada kategori = tampilkan semua
        }

        $category = StoreCategory::with(['storeCategoryVariants' => fn ($q) => $q->where('is_active', true)])
            ->find($store->store_category_id);

        if (! $category || $category->allow_all_variants) {
            return null; // allow_all = tampilkan semua
        }

        return $category->storeCategoryVariants->pluck('variant_id')->toArray();
    }

    /**
     * Cek apakah stok bahan di store cukup untuk membuat tiap ukuran.
     * Mengembalikan map: [size_id => bool|null]
     * null = tidak bisa dicek (data tidak lengkap)
     */
    private function buildStockSufficiencyMap(
        string $storeId,
        string $variantId,
        string $intensityId,
        $quantities
    ): array {
        // Ambil stok bahan yang dibutuhkan untuk variant+intensity ini
        $recipeIngredients = \App\Models\VariantRecipe::query()
            ->where('variant_id', $variantId)
            ->where('intensity_id', $intensityId)
            ->with('ingredient.storeIngredientStock', fn ($q) => $q->where('store_id', $storeId))
            ->get();

        if ($recipeIngredients->isEmpty()) {
            return [];
        }

        $map = [];

        foreach ($quantities as $sizeId => $isq) {
            $sufficient = true;

            foreach ($recipeIngredients as $recipe) {
                $stock = $recipe->ingredient->storeIngredientStock
                    ?->firstWhere('store_id', $storeId);

                if (! $stock) {
                    $sufficient = null; // Stok belum diset
                    break;
                }

                // Scale base_quantity (30ml) ke ukuran target
                // Scaling berdasarkan oil_quantity karena recipe adalah bahan minyak/bibit
                $baseOilQty   = 30; // base recipe adalah untuk 30ml oil
                $targetOilQty = $isq->oil_quantity;
                $scaleFactor  = $baseOilQty > 0 ? ($targetOilQty / $baseOilQty) : 1;

                $neededQty = $recipe->base_quantity * $scaleFactor;

                if ($stock->quantity < $neededQty) {
                    $sufficient = false;
                    break;
                }
            }

            $map[$sizeId] = $sufficient;
        }

        return $map;
    }
}
