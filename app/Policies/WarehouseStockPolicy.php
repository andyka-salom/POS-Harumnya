<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WarehouseIngredientStock;
use App\Models\WarehousePackagingStock;

class WarehouseStockPolicy
{
    /**
     * Determine if user can view any stocks
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_warehouse_stocks');
    }

    /**
     * Determine if user can view stock
     */
    public function view(User $user, $stock): bool
    {
        return $user->hasPermissionTo('view_warehouse_stocks');
    }

    /**
     * Determine if user can create stocks
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_warehouse_stocks');
    }

    /**
     * Determine if user can update stock
     */
    public function update(User $user, $stock): bool
    {
        return $user->hasPermissionTo('update_warehouse_stocks');
    }

    /**
     * Determine if user can delete stock
     */
    public function delete(User $user, $stock): bool
    {
        // Only allow delete if stock is empty
        if ($stock->quantity > 0) {
            return false;
        }

        return $user->hasPermissionTo('delete_warehouse_stocks');
    }

    /**
     * Determine if user can export stocks
     */
    public function export(User $user): bool
    {
        return $user->hasPermissionTo('export_warehouse_stocks');
    }
}
