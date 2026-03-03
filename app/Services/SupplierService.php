<?php

namespace App\Services;

use App\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Collection;

class SupplierService
{
    /**
     * Get active suppliers with caching
     */
    public function getActiveSuppliers(): Collection
    {
        return Cache::tags(['suppliers'])
            ->remember('suppliers.active', 300, function () {
                return Supplier::active()
                    ->orderBy('name')
                    ->select(['id', 'code', 'name', 'payment_term', 'credit_limit'])
                    ->get();
            });
    }

    /**
     * Get supplier by code
     */
    public function getSupplierByCode(string $code): ?Supplier
    {
        return Supplier::where('code', strtoupper($code))
            ->first();
    }

    /**
     * Check if supplier code exists
     */
    public function isCodeExists(string $code, ?string $excludeId = null): bool
    {
        $query = Supplier::where('code', strtoupper($code));

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * Generate next supplier code
     */
    public function generateNextCode(string $prefix = 'SUP'): string
    {
        $lastSupplier = Supplier::where('code', 'like', "{$prefix}-%")
            ->orderBy('code', 'desc')
            ->first();

        if (!$lastSupplier) {
            return "{$prefix}-001";
        }

        $lastNumber = (int) substr($lastSupplier->code, strlen($prefix) + 1);
        $nextNumber = str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);

        return "{$prefix}-{$nextNumber}";
    }

    /**
     * Bulk update supplier status
     */
    public function bulkUpdateStatus(array $supplierIds, bool $isActive): int
    {
        try {
            DB::beginTransaction();

            $updated = Supplier::whereIn('id', $supplierIds)
                ->update(['is_active' => $isActive]);

            Cache::tags(['suppliers'])->flush();

            DB::commit();

            Log::info('Bulk supplier status update', [
                'count' => $updated,
                'status' => $isActive,
                'supplier_ids' => $supplierIds,
            ]);

            return $updated;

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed bulk supplier status update', [
                'error' => $e->getMessage(),
                'supplier_ids' => $supplierIds,
            ]);

            throw $e;
        }
    }

    /**
     * Get suppliers with low credit limit usage
     */
    public function getSuppliersWithLowCreditUsage(float $threshold = 50): Collection
    {
        return Supplier::active()
            ->where('payment_term', '!=', 'cash')
            ->where('credit_limit', '>', 0)
            ->get()
            ->filter(function ($supplier) use ($threshold) {
                // This would need to be implemented with actual purchase data
                // For now, return all as placeholder
                return true;
            });
    }

    /**
     * Get supplier statistics
     */
    public function getStatistics(): array
    {
        return Cache::tags(['suppliers'])
            ->remember('suppliers.statistics', 600, function () {
                $total = Supplier::count();
                $active = Supplier::where('is_active', true)->count();
                $inactive = $total - $active;

                $byPaymentTerm = Supplier::select('payment_term', DB::raw('count(*) as count'))
                    ->groupBy('payment_term')
                    ->pluck('count', 'payment_term')
                    ->toArray();

                $totalCreditLimit = Supplier::where('payment_term', '!=', 'cash')
                    ->sum('credit_limit');

                return [
                    'total' => $total,
                    'active' => $active,
                    'inactive' => $inactive,
                    'by_payment_term' => $byPaymentTerm,
                    'total_credit_limit' => $totalCreditLimit,
                ];
            });
    }

    /**
     * Export suppliers to array
     */
    public function exportToArray(?array $filters = []): array
    {
        $query = Supplier::query();

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        if (isset($filters['payment_term'])) {
            $query->where('payment_term', $filters['payment_term']);
        }

        return $query->orderBy('code')
            ->get()
            ->map(function ($supplier) {
                return [
                    'Kode' => $supplier->code,
                    'Nama' => $supplier->name,
                    'Contact Person' => $supplier->contact_person,
                    'Telepon' => $supplier->phone,
                    'Email' => $supplier->email,
                    'Alamat' => $supplier->address,
                    'NPWP' => $supplier->tax_id,
                    'Termin Pembayaran' => $supplier->payment_term_label,
                    'Batas Kredit' => $supplier->credit_limit,
                    'Status' => $supplier->status_label,
                    'Dibuat' => $supplier->created_at->format('d/m/Y H:i'),
                ];
            })
            ->toArray();
    }

    /**
     * Validate credit limit for purchase
     */
    public function validateCreditLimit(Supplier $supplier, float $purchaseAmount): bool
    {
        if ($supplier->payment_term === 'cash') {
            return true;
        }

        // This would need to be implemented with actual purchase data
        // Check outstanding purchases vs credit limit
        // For now, return true as placeholder
        return $purchaseAmount <= $supplier->credit_limit;
    }

    /**
     * Clear supplier cache
     */
    public function clearCache(): void
    {
        Cache::tags(['suppliers'])->flush();
    }
}
