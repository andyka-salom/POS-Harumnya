<?php

namespace App\Services;

use App\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Collection;

class StoreService
{
    /**
     * Get active stores with caching
     */
    public function getActiveStores(): Collection
    {
        return Cache::tags(['stores'])
            ->remember('stores.active', 300, function () {
                return Store::active()
                    ->orderBy('name')
                    ->select(['id', 'code', 'name', 'address', 'manager_name'])
                    ->get();
            });
    }

    /**
     * Get store by code
     */
    public function getStoreByCode(string $code): ?Store
    {
        return Store::where('code', strtoupper($code))
            ->first();
    }

    /**
     * Check if store code exists
     */
    public function isCodeExists(string $code, ?string $excludeId = null): bool
    {
        $query = Store::where('code', strtoupper($code));

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * Generate next store code
     */
    public function generateNextCode(string $prefix = 'STR'): string
    {
        $lastStore = Store::where('code', 'like', "{$prefix}-%")
            ->orderBy('code', 'desc')
            ->first();

        if (!$lastStore) {
            return "{$prefix}-001";
        }

        $lastNumber = (int) substr($lastStore->code, strlen($prefix) + 1);
        $nextNumber = str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);

        return "{$prefix}-{$nextNumber}";
    }

    /**
     * Bulk update store status
     */
    public function bulkUpdateStatus(array $storeIds, bool $isActive): int
    {
        try {
            DB::beginTransaction();

            $updated = Store::whereIn('id', $storeIds)
                ->update(['is_active' => $isActive]);

            Cache::tags(['stores'])->flush();

            DB::commit();

            Log::info('Bulk store status update', [
                'count' => $updated,
                'status' => $isActive,
                'store_ids' => $storeIds,
            ]);

            return $updated;

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed bulk store status update', [
                'error' => $e->getMessage(),
                'store_ids' => $storeIds,
            ]);

            throw $e;
        }
    }

    /**
     * Get stores without managers
     */
    public function getStoresWithoutManagers(): Collection
    {
        return Store::active()
            ->whereNull('manager_name')
            ->orWhere('manager_name', '')
            ->get();
    }

    /**
     * Get store statistics
     */
    public function getStatistics(): array
    {
        return Cache::tags(['stores'])
            ->remember('stores.statistics', 600, function () {
                $total = Store::count();
                $active = Store::where('is_active', true)->count();
                $inactive = $total - $active;

                $withManagers = Store::whereNotNull('manager_name')
                    ->where('manager_name', '!=', '')
                    ->count();

                $withoutManagers = $total - $withManagers;

                $storesWithUsers = Store::has('users')->count();

                return [
                    'total' => $total,
                    'active' => $active,
                    'inactive' => $inactive,
                    'with_managers' => $withManagers,
                    'without_managers' => $withoutManagers,
                    'with_users' => $storesWithUsers,
                ];
            });
    }

    /**
     * Export stores to array
     */
    public function exportToArray(?array $filters = []): array
    {
        $query = Store::query();

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        return $query->orderBy('code')
            ->get()
            ->map(function ($store) {
                return [
                    'Kode' => $store->code,
                    'Nama Toko' => $store->name,
                    'Alamat' => $store->address,
                    'Telepon' => $store->phone,
                    'Manager' => $store->manager_name,
                    'Email' => $store->email,
                    'Status' => $store->status_label,
                    'Dibuat' => $store->created_at->format('d/m/Y H:i'),
                ];
            })
            ->toArray();
    }

    /**
     * Assign manager to store
     */
    public function assignManager(Store $store, string $managerName, ?string $email = null): bool
    {
        try {
            DB::beginTransaction();

            $store->update([
                'manager_name' => $managerName,
                'email' => $email ?? $store->email,
            ]);

            Cache::tags(['stores'])->flush();

            DB::commit();

            Log::info('Manager assigned to store', [
                'store_id' => $store->id,
                'manager_name' => $managerName,
            ]);

            return true;

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to assign manager', [
                'store_id' => $store->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Get stores by location/city
     */
    public function getStoresByLocation(string $location): Collection
    {
        return Store::active()
            ->where('address', 'like', "%{$location}%")
            ->get();
    }

    /**
     * Check if store can be deleted
     */
    public function canBeDeleted(Store $store): array
    {
        $hasUsers = $store->users()->exists();

        return [
            'can_delete' => !$hasUsers,
            'reason' => $hasUsers ? 'Toko masih memiliki pengguna terdaftar' : null,
            'users_count' => $store->users()->count(),
        ];
    }

    /**
     * Clear store cache
     */
    public function clearCache(): void
    {
        Cache::tags(['stores'])->flush();
    }
}
