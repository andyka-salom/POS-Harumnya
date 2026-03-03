<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductionLog;
use App\Models\ProductionLogIngredient;
use App\Models\ProductionLogPackaging;
use App\Models\VariantRecipe;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;
use App\Models\TransactionDetail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductionService
{
    /**
     * Process production when transaction is completed
     */
    public function processProductionForTransaction($transaction): void
    {
        DB::transaction(function () use ($transaction) {
            foreach ($transaction->details as $detail) {
                // Skip reward items (gratis dari diskon)
                if ($detail->is_reward_item) {
                    continue;
                }

                $this->produceProduct(
                    $detail->product,
                    $detail->qty,
                    $transaction->cashier->stores->first()->id ?? auth()->user()->stores->first()->id,
                    $transaction->id,
                    $detail->id
                );
            }
        });
    }

    /**
     * Produce product and deduct stocks
     */
    public function produceProduct(
        Product $product,
        int $quantity,
        string $storeId,
        ?string $transactionId = null,
        ?string $transactionDetailId = null
    ): ProductionLog {
        return DB::transaction(function () use (
            $product,
            $quantity,
            $storeId,
            $transactionId,
            $transactionDetailId
        ) {
            // Generate production number
            $productionNumber = $this->generateProductionNumber();

            // Create production log
            $productionLog = ProductionLog::create([
                'production_number' => $productionNumber,
                'transaction_id' => $transactionId,
                'transaction_detail_id' => $transactionDetailId,
                'product_id' => $product->id,
                'variant_id' => $product->variant_id,
                'intensity_id' => $product->intensity_id,
                'size_id' => $product->size_id,
                'quantity_produced' => $quantity,
                'store_id' => $storeId,
                'produced_by' => auth()->id(),
                'status' => 'processing',
                'produced_at' => now(),
            ]);

            // Process ingredients
            $this->deductIngredients($productionLog, $product, $quantity, $storeId);

            // Process packaging
            $this->deductPackaging($productionLog, $product, $quantity, $storeId);

            // Mark as completed
            $productionLog->update(['status' => 'completed']);

            return $productionLog;
        });
    }

    /**
     * Deduct ingredients from store stock
     */
    protected function deductIngredients(
        ProductionLog $productionLog,
        Product $product,
        int $quantity,
        string $storeId
    ): void {
        $recipes = VariantRecipe::where('variant_id', $product->variant_id)
            ->where('intensity_id', $product->intensity_id)
            ->where('size_id', $product->size_id)
            ->get();

        foreach ($recipes as $recipe) {
            $totalQuantity = $recipe->quantity * $quantity;

            // Get store stock
            $stock = StoreIngredientStock::where('store_id', $storeId)
                ->where('ingredient_id', $recipe->ingredient_id)
                ->lockForUpdate()
                ->firstOrFail();

            // Check sufficient stock
            if ($stock->quantity_ml < $totalQuantity) {
                throw new \Exception(
                    "Stok {$recipe->ingredient->name} tidak mencukupi. " .
                    "Tersedia: {$stock->quantity_ml} ml, Dibutuhkan: {$totalQuantity} ml"
                );
            }

            // Deduct stock
            $stock->quantity_ml -= $totalQuantity;
            $stock->total_value = $stock->quantity_ml * $stock->average_cost;
            $stock->last_out_at = now();
            $stock->last_out_by = auth()->id();
            $stock->last_out_qty = $totalQuantity;
            $stock->save();

            // Log ingredient usage
            ProductionLogIngredient::create([
                'production_log_id' => $productionLog->id,
                'ingredient_id' => $recipe->ingredient_id,
                'quantity_required' => $recipe->quantity,
                'total_quantity_used' => $totalQuantity,
                'unit' => $recipe->unit,
                'cost_per_unit' => $stock->average_cost,
                'total_cost' => $totalQuantity * $stock->average_cost,
            ]);
        }
    }

    /**
     * Deduct packaging from store stock
     */
    protected function deductPackaging(
        ProductionLog $productionLog,
        Product $product,
        int $quantity,
        string $storeId
    ): void {
        if (!$product->packaging_material_id) {
            return; // No packaging required
        }

        $stock = StorePackagingStock::where('store_id', $storeId)
            ->where('packaging_material_id', $product->packaging_material_id)
            ->lockForUpdate()
            ->firstOrFail();

        // Check sufficient stock (1 packaging per product)
        if ($stock->quantity < $quantity) {
            throw new \Exception(
                "Stok {$product->packagingMaterial->name} tidak mencukupi. " .
                "Tersedia: {$stock->quantity}, Dibutuhkan: {$quantity}"
            );
        }

        // Deduct stock
        $stock->quantity -= $quantity;
        $stock->total_value = $stock->quantity * $stock->average_cost;
        $stock->last_out_at = now();
        $stock->last_out_by = auth()->id();
        $stock->last_out_qty = $quantity;
        $stock->save();

        // Log packaging usage
        ProductionLogPackaging::create([
            'production_log_id' => $productionLog->id,
            'packaging_material_id' => $product->packaging_material_id,
            'quantity_per_unit' => 1,
            'total_quantity_used' => $quantity,
            'cost_per_unit' => $stock->average_cost,
            'total_cost' => $quantity * $stock->average_cost,
        ]);
    }

    /**
     * Generate unique production number
     */
    protected function generateProductionNumber(): string
    {
        $date = now()->format('Ymd');
        $random = strtoupper(Str::random(6));
        return "PROD-{$date}-{$random}";
    }

    /**
     * Get production history
     */
    public function getProductionHistory($storeId = null, $startDate = null, $endDate = null)
    {
        $query = ProductionLog::with([
            'product',
            'variant',
            'intensity',
            'size',
            'store',
            'producer',
            'transaction',
            'ingredients.ingredient',
            'packagings.packagingMaterial',
        ])->orderBy('produced_at', 'desc');

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        if ($startDate && $endDate) {
            $query->whereBetween('produced_at', [$startDate, $endDate]);
        }

        return $query->get();
    }
}
