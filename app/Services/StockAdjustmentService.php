<?php

namespace App\Services;

use App\Models\StockAdjustment;
use App\Models\WarehouseIngredientStock;
use App\Models\WarehousePackagingStock;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;
use Illuminate\Support\Facades\DB;

class StockAdjustmentService
{
    public function __construct(
        protected StockMovementService $stockMovementService
    ) {}

    /**
     * Process approved stock adjustment
     */
    public function processAdjustment(StockAdjustment $adjustment): void
    {
        DB::transaction(function () use ($adjustment) {
            foreach ($adjustment->items as $item) {
                // Get stock record
                $stockRecord = $this->getStockRecord(
                    $adjustment->location_type,
                    $adjustment->location_id,
                    $item->item_type,
                    $item->item_id
                );

                // Verify quantity_before matches current stock
                $currentStock = $stockRecord->quantity;

                // Update stock using quantity_adjustment (+ or -)
                $newStock = $currentStock + $item->quantity_adjustment;

                if ($newStock < 0) {
                    throw new \Exception("Stock cannot be negative for item: {$item->item->name}");
                }

                // Record stock movement
                $movementType = $this->getMovementType($adjustment->adjustment_type, $item->quantity_adjustment);

                $this->stockMovementService->recordMovement([
                    'location_type' => $adjustment->location_type,
                    'location_id' => $adjustment->location_id,
                    'item_type' => $item->item_type,
                    'item_id' => $item->item_id,
                    'movement_type' => $movementType,
                    'reference_id' => $adjustment->id,
                    'reference_number' => $adjustment->adjustment_number,
                    'quantity' => $item->quantity_adjustment, // positive or negative
                    'unit_cost' => $stockRecord->average_cost, // keep same avg cost for adjustments
                    'movement_date' => $adjustment->adjustment_date,
                    'notes' => "Adjustment: {$adjustment->reason}" . ($item->reason ? " - {$item->reason}" : ""),
                ]);
            }
        });
    }

    /**
     * Get current stock for item at location
     */
    public function getCurrentStock(string $locationType, string $locationId, string $itemType, string $itemId): float
    {
        $stockRecord = $this->getStockRecord($locationType, $locationId, $itemType, $itemId);
        return $stockRecord ? $stockRecord->quantity : 0;
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
     * Determine movement type based on adjustment type and quantity
     */
    private function getMovementType(string $adjustmentType, float $quantity): string
    {
        // If quantity is positive, it's IN movement
        // If quantity is negative, it's OUT movement

        return match($adjustmentType) {
            'adjustment_in' => 'adjustment_in',
            'adjustment_out' => 'adjustment_out',
            'waste' => 'waste',
            'found' => 'adjustment_in',
            'damaged' => 'waste',
            'expired' => 'waste',
            default => $quantity >= 0 ? 'adjustment_in' : 'adjustment_out',
        };
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
}
