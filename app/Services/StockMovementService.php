<?php

namespace App\Services;

use App\Models\StockMovement;
use App\Models\WarehouseIngredientStock;
use App\Models\WarehousePackagingStock;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;
use Illuminate\Support\Facades\DB;

class StockMovementService
{
    /**
     * Record stock movement dan update stock dengan weighted average costing
     */
    public function recordMovement(array $data): StockMovement
    {
        return DB::transaction(function () use ($data) {
            // Get stock record
            $stockRecord = $this->getStockRecord(
                $data['location_type'],
                $data['location_id'],
                $data['item_type'],
                $data['item_id']
            );

            // Simpan data sebelum update
            $stockBefore = $stockRecord->quantity;
            $avgCostBefore = $stockRecord->average_cost;

            // Hitung stock dan average cost baru
            $quantity = $data['quantity']; // positive = in, negative = out
            $unitCost = $data['unit_cost'];

            if ($quantity > 0) {
                // Stock IN: Calculate weighted average
                $newStock = $stockBefore + $quantity;

                if ($newStock > 0) {
                    $totalValueBefore = $stockBefore * $avgCostBefore;
                    $totalValueNew = $quantity * $unitCost;
                    $avgCostAfter = ($totalValueBefore + $totalValueNew) / $newStock;
                } else {
                    $avgCostAfter = $unitCost;
                }
            } else {
                // Stock OUT: Average cost tetap sama
                $newStock = $stockBefore + $quantity; // quantity is negative
                $avgCostAfter = $avgCostBefore;
            }

            $stockAfter = max(0, $newStock); // Prevent negative stock

            // Update stock record
            $stockRecord->update([
                'quantity' => $stockAfter,
                'average_cost' => $avgCostAfter,
                'total_value' => $stockAfter * $avgCostAfter,
            ]);

            // Update last movement info
            if ($quantity > 0) {
                $stockRecord->update([
                    'last_in_at' => now(),
                    'last_in_by' => auth()->id(),
                    'last_in_qty' => abs($quantity),
                ]);
            } else {
                $stockRecord->update([
                    'last_out_at' => now(),
                    'last_out_by' => auth()->id(),
                    'last_out_qty' => abs($quantity),
                ]);
            }

            // Get stockable type and ID
            $stockableType = $this->getStockableType($data['location_type'], $data['item_type']);

            // Create movement record
            return StockMovement::create([
                'location_type' => $data['location_type'],
                'location_id' => $data['location_id'],
                'stockable_type' => $stockableType,
                'stockable_id' => $stockRecord->id,
                'item_type' => $data['item_type'],
                'item_id' => $data['item_id'],
                'movement_type' => $data['movement_type'],
                'reference_id' => $data['reference_id'] ?? null,
                'reference_number' => $data['reference_number'] ?? null,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'avg_cost_before' => $avgCostBefore,
                'avg_cost_after' => $avgCostAfter,
                'movement_date' => $data['movement_date'] ?? now(),
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);
        });
    }

    /**
     * Get or create stock record
     */
    private function getStockRecord(string $locationType, string $locationId, string $itemType, string $itemId)
    {
        $modelClass = $this->getStockModelClass($locationType, $itemType);
        $locationField = $this->getLocationField($locationType);
        $itemField = $this->getItemField($itemType);

        return $modelClass::firstOrCreate(
            [
                $locationField => $locationId,
                $itemField => $itemId,
            ],
            [
                'quantity' => 0,
                'average_cost' => 0,
                'total_value' => 0,
            ]
        );
    }

    /**
     * Get stock model class based on location and item type
     */
    private function getStockModelClass(string $locationType, string $itemType): string
    {
        return match($locationType) {
            'App\\Models\\Warehouse' => match($itemType) {
                'App\\Models\\Ingredient' => WarehouseIngredientStock::class,
                'App\\Models\\PackagingMaterial' => WarehousePackagingStock::class,
            },
            'App\\Models\\Store' => match($itemType) {
                'App\\Models\\Ingredient' => StoreIngredientStock::class,
                'App\\Models\\PackagingMaterial' => StorePackagingStock::class,
            },
        };
    }

    /**
     * Get stockable type for stock movement record
     */
    private function getStockableType(string $locationType, string $itemType): string
    {
        return match($locationType) {
            'App\\Models\\Warehouse' => match($itemType) {
                'App\\Models\\Ingredient' => 'App\\Models\\WarehouseIngredientStock',
                'App\\Models\\PackagingMaterial' => 'App\\Models\\WarehousePackagingStock',
            },
            'App\\Models\\Store' => match($itemType) {
                'App\\Models\\Ingredient' => 'App\\Models\\StoreIngredientStock',
                'App\\Models\\PackagingMaterial' => 'App\\Models\\StorePackagingStock',
            },
        };
    }

    /**
     * Get location field name
     */
    private function getLocationField(string $locationType): string
    {
        return match($locationType) {
            'App\\Models\\Warehouse' => 'warehouse_id',
            'App\\Models\\Store' => 'store_id',
        };
    }

    /**
     * Get item field name
     */
    private function getItemField(string $itemType): string
    {
        return match($itemType) {
            'App\\Models\\Ingredient' => 'ingredient_id',
            'App\\Models\\PackagingMaterial' => 'packaging_material_id',
        };
    }

    /**
     * Record purchase items as stock movements
     */
    public function recordPurchaseReceived($purchase): void
    {
        foreach ($purchase->items as $item) {
            $this->recordMovement([
                'location_type' => $purchase->destination_type,
                'location_id' => $purchase->destination_id,
                'item_type' => $item->item_type,
                'item_id' => $item->item_id,
                'movement_type' => 'purchase_in',
                'reference_id' => $purchase->id,
                'reference_number' => $purchase->purchase_number,
                'quantity' => $item->quantity, // positive for IN
                'unit_cost' => $item->unit_price,
                'movement_date' => $purchase->actual_delivery_date ?? now(),
                'notes' => "Purchase {$purchase->purchase_number} received",
            ]);
        }
    }
}
