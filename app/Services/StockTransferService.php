<?php

namespace App\Services;

use App\Models\StockTransfer;
use App\Models\WarehouseIngredientStock;
use App\Models\WarehousePackagingStock;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;
use Illuminate\Support\Facades\DB;

class StockTransferService
{
    public function __construct(
        protected StockMovementService $stockMovementService
    ) {}

    /**
     * Get current stock at a location for an item
     */
    public function getCurrentStock(string $locationType, string $locationId, string $itemType, string $itemId): array
    {
        $stockRecord = $this->getStockRecord($locationType, $locationId, $itemType, $itemId);

        return [
            'quantity' => $stockRecord ? $stockRecord->quantity : 0,
            'average_cost' => $stockRecord ? $stockRecord->average_cost : 0,
        ];
    }

    /**
     * Process send (stock OUT from source)
     * Called when transfer status: approved → in_transit
     */
    public function processSend(StockTransfer $transfer): void
    {
        DB::transaction(function () use ($transfer) {
            foreach ($transfer->items as $item) {
                // Get stock from source
                $sourceStock = $this->getStockRecord(
                    $transfer->from_location_type,
                    $transfer->from_location_id,
                    $item->item_type,
                    $item->item_id
                );

                if (!$sourceStock || $sourceStock->quantity < $item->quantity_requested) {
                    throw new \Exception("Insufficient stock for {$item->item->name} at source location");
                }

                // Capture unit cost from source
                $item->update([
                    'quantity_sent' => $item->quantity_requested,
                    'unit_cost' => $sourceStock->average_cost,
                ]);

                // Record stock OUT from source
                $this->stockMovementService->recordMovement([
                    'location_type' => $transfer->from_location_type,
                    'location_id' => $transfer->from_location_id,
                    'item_type' => $item->item_type,
                    'item_id' => $item->item_id,
                    'movement_type' => 'transfer_out',
                    'reference_id' => $transfer->id,
                    'reference_number' => $transfer->transfer_number,
                    'quantity' => -$item->quantity_sent, // NEGATIVE for OUT
                    'unit_cost' => $item->unit_cost,
                    'movement_date' => $transfer->transfer_date,
                    'notes' => "Transfer to {$transfer->toLocation->name}",
                ]);
            }
        });
    }

    /**
     * Process receive (stock IN to destination)
     * Called when transfer status: in_transit → received → completed
     */
    public function processReceive(StockTransfer $transfer, array $receivedQuantities): void
    {
        DB::transaction(function () use ($transfer, $receivedQuantities) {
            foreach ($transfer->items as $item) {
                $quantityReceived = $receivedQuantities[$item->id] ?? $item->quantity_sent;

                // Update item with received quantity
                $item->update([
                    'quantity_received' => $quantityReceived,
                ]);

                // Record stock IN to destination
                $this->stockMovementService->recordMovement([
                    'location_type' => $transfer->to_location_type,
                    'location_id' => $transfer->to_location_id,
                    'item_type' => $item->item_type,
                    'item_id' => $item->item_id,
                    'movement_type' => 'transfer_in',
                    'reference_id' => $transfer->id,
                    'reference_number' => $transfer->transfer_number,
                    'quantity' => $quantityReceived, // POSITIVE for IN
                    'unit_cost' => $item->unit_cost, // Use cost from source
                    'movement_date' => $transfer->actual_arrival_date ?? now(),
                    'notes' => "Transfer from {$transfer->fromLocation->name}",
                ]);

                // If there's shortage, record adjustment OUT at source (correction)
                if ($quantityReceived < $item->quantity_sent) {
                    $shortage = $item->quantity_sent - $quantityReceived;

                    $this->stockMovementService->recordMovement([
                        'location_type' => $transfer->from_location_type,
                        'location_id' => $transfer->from_location_id,
                        'item_type' => $item->item_type,
                        'item_id' => $item->item_id,
                        'movement_type' => 'adjustment_in', // Return shortage to source
                        'reference_id' => $transfer->id,
                        'reference_number' => $transfer->transfer_number . '-SHORT',
                        'quantity' => $shortage, // POSITIVE (returning)
                        'unit_cost' => $item->unit_cost,
                        'movement_date' => $transfer->actual_arrival_date ?? now(),
                        'notes' => "Shortage return from transfer {$transfer->transfer_number}",
                    ]);
                }
            }
        });
    }

    /**
     * Cancel transfer and return stock to source (if in_transit)
     */
    public function processCancel(StockTransfer $transfer): void
    {
        // Only process if status is in_transit (stock already out)
        if ($transfer->status !== 'in_transit') {
            return;
        }

        DB::transaction(function () use ($transfer) {
            foreach ($transfer->items as $item) {
                // Return stock to source
                $this->stockMovementService->recordMovement([
                    'location_type' => $transfer->from_location_type,
                    'location_id' => $transfer->from_location_id,
                    'item_type' => $item->item_type,
                    'item_id' => $item->item_id,
                    'movement_type' => 'adjustment_in',
                    'reference_id' => $transfer->id,
                    'reference_number' => $transfer->transfer_number . '-CANCEL',
                    'quantity' => $item->quantity_sent, // POSITIVE (returning)
                    'unit_cost' => $item->unit_cost,
                    'movement_date' => now(),
                    'notes' => "Cancelled transfer {$transfer->transfer_number}",
                ]);
            }
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
