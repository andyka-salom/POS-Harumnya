<?php

namespace App\Services;

use App\Models\Product;
use App\Models\VariantRecipe;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;

class ProductService
{
    /**
     * Calculate available stock based on ingredients
     */
    public function calculateAvailableStock(Product $product, $storeId): int
    {
        // Get recipe for this product
        $recipes = VariantRecipe::where('variant_id', $product->variant_id)
            ->where('intensity_id', $product->intensity_id)
            ->where('size_id', $product->size_id)
            ->get();

        if ($recipes->isEmpty()) {
            return 0;
        }

        $maxQuantities = [];

        // Check each ingredient stock
        foreach ($recipes as $recipe) {
            $stock = StoreIngredientStock::where('store_id', $storeId)
                ->where('ingredient_id', $recipe->ingredient_id)
                ->first();

            if (!$stock || $stock->quantity_ml <= 0) {
                return 0; // Ingredient tidak tersedia
            }

            // Calculate how many products can be made from this ingredient
            $possibleQty = floor($stock->quantity_ml / $recipe->quantity);
            $maxQuantities[] = $possibleQty;
        }

        // Check packaging stock
        if ($product->packaging_material_id) {
            $packagingStock = StorePackagingStock::where('store_id', $storeId)
                ->where('packaging_material_id', $product->packaging_material_id)
                ->first();

            if (!$packagingStock || $packagingStock->quantity <= 0) {
                return 0; // Packaging tidak tersedia
            }

            $maxQuantities[] = $packagingStock->quantity;
        }

        // Return minimum (bottleneck)
        return !empty($maxQuantities) ? min($maxQuantities) : 0;
    }

    /**
     * Update virtual stock for product
     */
    public function updateVirtualStock(Product $product, $storeId): void
    {
        $availableStock = $this->calculateAvailableStock($product, $storeId);
        $product->stock = $availableStock;
        $product->save();
    }

    /**
     * Get products with available stock for store
     */
    public function getAvailableProducts($storeId)
    {
        $products = Product::with(['variant', 'intensity', 'size', 'packagingMaterial'])
            ->where('is_active', true)
            ->get();

        foreach ($products as $product) {
            $product->stock = $this->calculateAvailableStock($product, $storeId);
        }

        return $products->where('stock', '>', 0);
    }

    /**
     * Calculate product costs based on recipe
     */
    public function calculateProductCosts(Product $product): array
    {
        $recipes = VariantRecipe::with('ingredient')
            ->where('variant_id', $product->variant_id)
            ->where('intensity_id', $product->intensity_id)
            ->where('size_id', $product->size_id)
            ->get();

        $ingredientCost = 0;

        foreach ($recipes as $recipe) {
            // Assuming we have average_cost in ingredient or store stock
            $costPerMl = $recipe->ingredient->average_cost ?? 0;
            $ingredientCost += ($costPerMl * $recipe->quantity);
        }

        $packagingCost = 0;
        if ($product->packagingMaterial) {
            $packagingCost = $product->packagingMaterial->cost_price;
        }

        return [
            'ingredient_cost' => round($ingredientCost, 2),
            'packaging_cost' => round($packagingCost, 2),
            'total_cost' => round($ingredientCost + $packagingCost, 2),
        ];
    }
}
