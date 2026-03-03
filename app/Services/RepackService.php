<?php

namespace App\Services;

use App\Models\RepackBatch;
use App\Models\WarehouseIngredientStock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RepackService
{
    /**
     * Process repack batch and update stocks
     * 
     * Flow:
     * 1. Validate all input stocks available
     * 2. Deduct input ingredients from warehouse stock
     * 3. Add output (compound) ingredient to warehouse stock
     * 4. Update batch status to completed
     */
    public function processBatch(RepackBatch $batch): bool
    {
        DB::beginTransaction();
        
        try {
            // 1. Validate all input stocks available
            $this->validateInputStocks($batch);
            
            // 2. Deduct input ingredients from stock
            $this->deductInputStocks($batch);
            
            // 3. Add output (compound) ingredient to stock
            $this->addOutputStock($batch);
            
            // 4. Update batch status
            $batch->update(['status' => 'completed']);
            
            DB::commit();
            
            Log::info('Repack batch processed successfully', [
                'batch_id' => $batch->id,
                'batch_number' => $batch->batch_number,
                'output_ingredient' => $batch->outputIngredient->name,
                'output_quantity' => $batch->output_quantity
            ]);
            
            return true;
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Repack batch processing failed', [
                'batch_id' => $batch->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }
    
    /**
     * Validate that all input ingredients have sufficient stock
     */
    protected function validateInputStocks(RepackBatch $batch): void
    {
        foreach ($batch->items as $item) {
            $stock = WarehouseIngredientStock::where('warehouse_id', $batch->warehouse_id)
                ->where('ingredient_id', $item->ingredient_id)
                ->first();
            
            if (!$stock) {
                throw new \Exception(
                    "Stok untuk {$item->ingredient->name} tidak ditemukan di gudang {$batch->warehouse->name}"
                );
            }
            
            if ($stock->quantity_ml < $item->quantity_used) {
                throw new \Exception(
                    "Stok {$item->ingredient->name} tidak cukup. " .
                    "Tersedia: {$stock->quantity_ml} {$item->unit}, " .
                    "Dibutuhkan: {$item->quantity_used} {$item->unit}"
                );
            }
        }
    }
    
    /**
     * Deduct input ingredients from warehouse stock
     */
    protected function deductInputStocks(RepackBatch $batch): void
    {
        $totalInputCost = 0;
        
        foreach ($batch->items as $item) {
            $stock = WarehouseIngredientStock::where('warehouse_id', $batch->warehouse_id)
                ->where('ingredient_id', $item->ingredient_id)
                ->lockForUpdate()
                ->first();
            
            // Record stock before
            $item->stock_before = $stock->quantity_ml;
            $item->unit_cost = $stock->average_cost;
            $item->total_cost = $item->quantity_used * $stock->average_cost;
            
            // Deduct stock
            $stock->quantity_ml -= $item->quantity_used;
            $stock->total_value = $stock->quantity_ml * $stock->average_cost;
            $stock->last_out_at = now();
            $stock->last_out_by = $batch->user_id;
            $stock->last_out_qty = $item->quantity_used;
            $stock->save();
            
            // Record stock after
            $item->stock_after = $stock->quantity_ml;
            $item->save();
            
            // Accumulate total cost
            $totalInputCost += $item->total_cost;
            
            Log::info('Input stock deducted', [
                'ingredient' => $item->ingredient->name,
                'quantity_used' => $item->quantity_used,
                'stock_before' => $item->stock_before,
                'stock_after' => $item->stock_after
            ]);
        }
        
        // Update batch total input cost and output cost per unit
        $batch->total_input_cost = $totalInputCost;
        $batch->output_cost_per_unit = $batch->output_quantity > 0 
            ? $totalInputCost / $batch->output_quantity 
            : 0;
        $batch->save();
        
        Log::info('Total input cost calculated', [
            'total_input_cost' => $totalInputCost,
            'output_cost_per_unit' => $batch->output_cost_per_unit
        ]);
    }
    
    /**
     * Add output (compound) ingredient to warehouse stock
     */
    protected function addOutputStock(RepackBatch $batch): void
    {
        $stock = WarehouseIngredientStock::firstOrCreate(
            [
                'warehouse_id' => $batch->warehouse_id,
                'ingredient_id' => $batch->output_ingredient_id,
            ],
            [
                'quantity_ml' => 0,
                'average_cost' => 0,
            ]
        );
        
        // Calculate new weighted average cost
        $oldTotal = $stock->quantity_ml * $stock->average_cost;
        $newTotal = $batch->output_quantity * $batch->output_cost_per_unit;
        $newQuantity = $stock->quantity_ml + $batch->output_quantity;
        $newAverageCost = $newQuantity > 0 ? ($oldTotal + $newTotal) / $newQuantity : 0;
        
        Log::info('Calculating output stock', [
            'old_quantity' => $stock->quantity_ml,
            'old_cost' => $stock->average_cost,
            'new_quantity_added' => $batch->output_quantity,
            'new_cost' => $batch->output_cost_per_unit,
            'final_quantity' => $newQuantity,
            'final_average_cost' => $newAverageCost
        ]);
        
        // Update stock
        $stock->quantity_ml = $newQuantity;
        $stock->average_cost = $newAverageCost;
        $stock->total_value = $newQuantity * $newAverageCost;
        $stock->last_restock_at = now();
        $stock->last_restock_by = $batch->user_id;
        $stock->last_restock_qty = $batch->output_quantity;
        $stock->save();
        
        Log::info('Output stock added', [
            'output_ingredient' => $batch->outputIngredient->name,
            'quantity_added' => $batch->output_quantity,
            'new_stock_total' => $stock->quantity_ml,
            'new_average_cost' => $stock->average_cost
        ]);
    }
    
    /**
     * Cancel batch and reverse stock changes (if completed)
     */
    public function cancelBatch(RepackBatch $batch): bool
    {
        // Only allow cancel if draft, processing, or completed
        if ($batch->status === 'cancelled') {
            throw new \Exception('Batch sudah dibatalkan');
        }
        
        DB::beginTransaction();
        
        try {
            // If completed, reverse the stock changes
            if ($batch->status === 'completed') {
                $this->reverseStockChanges($batch);
            }
            
            // Update status
            $batch->update(['status' => 'cancelled']);
            
            DB::commit();
            
            Log::info('Repack batch cancelled', [
                'batch_id' => $batch->id,
                'batch_number' => $batch->batch_number,
                'previous_status' => $batch->status
            ]);
            
            return true;
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Failed to cancel repack batch', [
                'batch_id' => $batch->id,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }
    
    /**
     * Reverse stock changes for cancelled batch
     */
    protected function reverseStockChanges(RepackBatch $batch): void
    {
        // 1. Remove output stock
        $outputStock = WarehouseIngredientStock::where('warehouse_id', $batch->warehouse_id)
            ->where('ingredient_id', $batch->output_ingredient_id)
            ->lockForUpdate()
            ->first();
        
        if ($outputStock) {
            if ($outputStock->quantity_ml < $batch->output_quantity) {
                throw new \Exception(
                    'Tidak bisa cancel: Stok output sudah digunakan. ' .
                    'Tersedia: ' . $outputStock->quantity_ml . ', ' .
                    'Perlu dikembalikan: ' . $batch->output_quantity
                );
            }
            
            $outputStock->quantity_ml -= $batch->output_quantity;
            $outputStock->total_value = $outputStock->quantity_ml * $outputStock->average_cost;
            $outputStock->save();
            
            Log::info('Output stock removed', [
                'ingredient' => $batch->outputIngredient->name,
                'quantity_removed' => $batch->output_quantity
            ]);
        }
        
        // 2. Restore input stocks
        foreach ($batch->items as $item) {
            $stock = WarehouseIngredientStock::where('warehouse_id', $batch->warehouse_id)
                ->where('ingredient_id', $item->ingredient_id)
                ->lockForUpdate()
                ->first();
            
            if ($stock) {
                $stock->quantity_ml += $item->quantity_used;
                $stock->total_value = $stock->quantity_ml * $stock->average_cost;
                $stock->save();
                
                Log::info('Input stock restored', [
                    'ingredient' => $item->ingredient->name,
                    'quantity_restored' => $item->quantity_used
                ]);
            }
        }
    }
}
