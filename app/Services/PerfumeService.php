<?php

namespace App\Services;

use App\Models\Variant;
use App\Models\Intensity;
use App\Models\Size;
use App\Models\VariantRecipe;
use App\Models\StoreIngredientStock;

class PerfumeService
{
    /**
     * Check if store has enough ingredient stock to make perfume
     */
    public function checkStockAvailability($variantId, $intensityId, $sizeId, $storeId, $quantity = 1)
    {
        // Get recipe for this perfume
        $recipes = VariantRecipe::with('ingredient')
            ->where('variant_id', $variantId)
            ->where('intensity_id', $intensityId)
            ->where('size_id', $sizeId)
            ->get();

        if ($recipes->isEmpty()) {
            return [
                'can_make' => false,
                'message' => 'Resep tidak ditemukan',
                'missing_ingredients' => [],
            ];
        }

        $missingIngredients = [];

        foreach ($recipes as $recipe) {
            // Get stock for this ingredient at this store
            $stock = StoreIngredientStock::where('store_id', $storeId)
                ->where('ingredient_id', $recipe->ingredient_id)
                ->first();

            $currentStock = $stock ? $stock->quantity_ml : 0;
            $neededQuantity = $recipe->quantity * $quantity;

            if ($currentStock < $neededQuantity) {
                $missingIngredients[] = [
                    'ingredient_id' => $recipe->ingredient_id,
                    'name' => $recipe->ingredient->name,
                    'needed' => $neededQuantity,
                    'available' => $currentStock,
                    'shortage' => $neededQuantity - $currentStock,
                ];
            }
        }

        return [
            'can_make' => empty($missingIngredients),
            'message' => empty($missingIngredients) ? 'Stok cukup' : 'Stok tidak cukup',
            'missing_ingredients' => $missingIngredients,
        ];
    }

    /**
     * Calculate total ingredient cost for a perfume
     */
    public function calculateIngredientCost($variantId, $intensityId, $sizeId)
    {
        $recipes = VariantRecipe::with(['ingredient', 'ingredient.storeStocks'])
            ->where('variant_id', $variantId)
            ->where('intensity_id', $intensityId)
            ->where('size_id', $sizeId)
            ->get();

        $totalCost = 0;

        foreach ($recipes as $recipe) {
            // Get average cost from store stocks
            $avgCost = $recipe->ingredient->storeStocks()
                ->where('quantity_ml', '>', 0)
                ->avg('average_cost') ?? 0;

            // Cost for this ingredient in this recipe
            $cost = $avgCost * $recipe->quantity;
            $totalCost += $cost;
        }

        return $totalCost;
    }

    /**
     * Get all ingredients needed for a perfume with quantities
     */
    public function getIngredientsList($variantId, $intensityId, $sizeId)
    {
        return VariantRecipe::with('ingredient')
            ->where('variant_id', $variantId)
            ->where('intensity_id', $intensityId)
            ->where('size_id', $sizeId)
            ->get()
            ->map(function ($recipe) {
                return [
                    'ingredient_id' => $recipe->ingredient_id,
                    'name' => $recipe->ingredient->name,
                    'quantity_ml' => $recipe->quantity,
                    'unit' => $recipe->unit,
                ];
            });
    }

    /**
     * Deduct ingredient stocks after production
     * This is called by ProductionService
     */
    public function deductIngredientStocks($variantId, $intensityId, $sizeId, $storeId, $quantity = 1)
    {
        $recipes = VariantRecipe::where('variant_id', $variantId)
            ->where('intensity_id', $intensityId)
            ->where('size_id', $sizeId)
            ->get();

        foreach ($recipes as $recipe) {
            $stock = StoreIngredientStock::where('store_id', $storeId)
                ->where('ingredient_id', $recipe->ingredient_id)
                ->lockForUpdate() // Prevent race conditions
                ->first();

            if ($stock) {
                $usedQuantity = $recipe->quantity * $quantity;

                $stock->quantity_ml -= $usedQuantity;

                // Update last_out tracking
                $stock->last_out_at = now();
                $stock->last_out_by = auth()->id();
                $stock->last_out_qty = $usedQuantity;

                // Recalculate total value
                $stock->total_value = $stock->quantity_ml * $stock->average_cost;

                $stock->save();

                // Log the stock movement
                \App\Models\IngredientStockMovement::create([
                    'store_id' => $storeId,
                    'ingredient_id' => $recipe->ingredient_id,
                    'type' => 'out',
                    'quantity_ml' => $usedQuantity,
                    'unit_cost' => $stock->average_cost,
                    'total_cost' => $usedQuantity * $stock->average_cost,
                    'reference_type' => 'production',
                    'notes' => "Production: {$variantId}-{$intensityId}-{$sizeId} x{$quantity}",
                    'created_by' => auth()->id(),
                ]);
            }
        }
    }

    /**
     * Get perfume details for display
     */
    public function getPerfumeDetails($variantId, $intensityId, $sizeId)
    {
        $variant = Variant::find($variantId);
        $intensity = Intensity::find($intensityId);
        $size = Size::find($sizeId);

        if (!$variant || !$intensity || !$size) {
            return null;
        }

        return [
            'variant' => $variant,
            'intensity' => $intensity,
            'size' => $size,
            'title' => "{$variant->name} - {$intensity->name} - {$size->name}",
            'volume_ml' => $size->volume_ml,
            'ingredients' => $this->getIngredientsList($variantId, $intensityId, $sizeId),
        ];
    }
}
