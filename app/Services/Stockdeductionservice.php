<?php

namespace App\Services;

use App\Models\Ingredient;
use App\Models\IntensitySizeQuantity;
use App\Models\PackagingMaterial;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\StoreIngredientStock;
use App\Models\StorePackagingStock;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * StockDeductionService
 *
 * Bertanggung jawab mengurangi stok toko setelah penjualan selesai.
 *
 * ALUR PENGURANGAN STOK:
 * ──────────────────────────────────────────────────────────────────────────
 * 1. INGREDIENT (bahan parfum)
 *    Setiap SaleItem parfum punya: variant_id, intensity_id, size_id, qty
 *    → Cari resep volume dari intensity_size_quantities (oil_qty, alcohol_qty)
 *    → Ambil ingredient dari product_recipes (atau variant_recipes jika produk
 *      belum di-generate)
 *    → Kurangi store_ingredient_stocks sesuai volume × qty_terjual
 *
 * 2. PACKAGING MATERIAL
 *    Setiap SaleItemPackaging punya: packaging_material_id, qty
 *    → Kurangi store_packaging_stocks langsung
 *
 * 3. STANDALONE PACKAGING (packaging tanpa item parfum)
 *    → Kurangi store_packaging_stocks langsung
 *
 * CATATAN PENTING:
 *   - Stok BOLEH NEGATIF (sesuai desain migration, bigInteger SIGNED)
 *     → Hanya dicatat sebagai warning di log
 *   - Setiap gerakan dicatat di stock_movements untuk audit trail
 *   - Semua operasi dalam 1 DB transaction (dipanggil dari dalam tx checkout)
 * ──────────────────────────────────────────────────────────────────────────
 */
class StockDeductionService
{
    /**
     * Entry point utama — dipanggil dari TransactionController::store()
     * setelah Sale & SaleItems berhasil dibuat.
     *
     * @param  Sale        $sale          Objek Sale yang baru dibuat
     * @param  string      $storeId       UUID toko tempat penjualan
     * @param  Collection  $saleItems     Koleksi SaleItem (dengan relasi packagings)
     */
    public function deductAfterSale(Sale $sale, string $storeId, Collection $saleItems): void
    {
        foreach ($saleItems as $saleItem) {
            // ── A. Deduct ingredient bahan parfum ─────────────────────────────
            if ($saleItem->intensity_id_snapshot && $saleItem->size_id_snapshot) {
                $this->deductIngredients($sale, $storeId, $saleItem);
            }

            // ── B. Deduct packaging yang melekat pada item ────────────────────
            if ($saleItem->packagings && $saleItem->packagings->isNotEmpty()) {
                foreach ($saleItem->packagings as $sip) {
                    if ($sip->packaging_material_id) {
                        $this->deductPackagingMaterial(
                            sale:               $sale,
                            storeId:            $storeId,
                            packagingMaterialId: $sip->packaging_material_id,
                            packagingName:      $sip->packaging_name,
                            packagingCode:      $sip->packaging_code,
                            qty:                $sip->qty,
                        );
                    }
                }
            }
        }
    }

    /**
     * Deduct packaging standalone (tanpa item parfum).
     * Dipanggil terpisah dari deductAfterSale karena standalone packaging
     * tidak punya SaleItem induk.
     *
     * @param  Sale   $sale
     * @param  string $storeId
     * @param  array  $standalonePkgs   [['pkg' => PackagingMaterial, 'qty' => int], ...]
     */
    public function deductStandalonePackagings(Sale $sale, string $storeId, array $standalonePkgs): void
    {
        foreach ($standalonePkgs as $sp) {
            $pkg = $sp['pkg'];
            $qty = (int) ($sp['qty'] ?? 1);

            $this->deductPackagingMaterial(
                sale:               $sale,
                storeId:            $storeId,
                packagingMaterialId: $pkg->id,
                packagingName:      $pkg->name,
                packagingCode:      $pkg->code,
                qty:                $qty,
            );
        }
    }

    // =========================================================================
    // PRIVATE — INGREDIENT DEDUCTION
    // =========================================================================

    /**
     * Kurangi stok ingredient di toko berdasarkan resep parfum.
     *
     * Prioritas sumber resep:
     *   1. product_recipes (jika product_id ada — sudah di-generate)
     *   2. variant_recipes + intensity_size_quantities (made-to-order)
     */
    private function deductIngredients(Sale $sale, string $storeId, SaleItem $saleItem): void
    {
        $intensityId = $saleItem->intensity_id_snapshot;
        $sizeId      = $saleItem->size_id_snapshot;
        $variantId   = $saleItem->variant_id_snapshot;
        $qtySold     = $saleItem->qty;

        // ── Dapatkan volume quantities untuk size+intensity ini ───────────────
        $isq = IntensitySizeQuantity::where('intensity_id', $intensityId)
            ->where('size_id', $sizeId)
            ->where('is_active', true)
            ->first();

        if (! $isq) {
            Log::warning("[StockDeduction] IntensitySizeQuantity tidak ditemukan", [
                'sale_id'      => $sale->id,
                'sale_item_id' => $saleItem->id,
                'intensity_id' => $intensityId,
                'size_id'      => $sizeId,
            ]);
            return;
        }

        // ── Cari resep ingredient ─────────────────────────────────────────────
        $recipes = $this->getRecipes($saleItem, $intensityId, $variantId);

        if ($recipes->isEmpty()) {
            Log::warning("[StockDeduction] Resep tidak ditemukan", [
                'sale_id'      => $sale->id,
                'sale_item_id' => $saleItem->id,
                'product_id'   => $saleItem->product_id,
                'variant_id'   => $variantId,
                'intensity_id' => $intensityId,
            ]);
            return;
        }

        // ── Hitung volume masing-masing ingredient ────────────────────────────
        // Base size untuk scaling adalah 30ml (sesuai variant_recipes)
        $baseSize = 30;
        $actualVolume = $isq->total_volume; // volume_ml toko ini

        foreach ($recipes as $recipe) {
            // Jika dari product_recipes → quantity sudah scaled
            // Jika dari variant_recipes → perlu scale ke actual volume
            $quantityPerUnit = $recipe->source === 'product'
                ? (float) $recipe->quantity
                : (float) $recipe->base_quantity * ($actualVolume / $baseSize);

            // Total qty ingredient yang dikurangi
            $totalQtyToDeduct = $quantityPerUnit * $qtySold;

            if ($totalQtyToDeduct <= 0) continue;

            $this->deductIngredientStock(
                sale:         $sale,
                storeId:      $storeId,
                ingredientId: $recipe->ingredient_id,
                ingredientName: $recipe->ingredient_name ?? null,
                ingredientCode: $recipe->ingredient_code ?? null,
                ingredientUnit: $recipe->unit ?? 'ml',
                qty:          $totalQtyToDeduct,
            );
        }
    }

    /**
     * Ambil resep — coba product_recipes dulu, fallback ke variant_recipes.
     */
    private function getRecipes(SaleItem $saleItem, string $intensityId, ?string $variantId): Collection
    {
        // ── OPSI 1: product_recipes (sudah scaled, lebih presisi) ────────────
        if ($saleItem->product_id) {
            $rows = DB::table('product_recipes as pr')
                ->join('ingredients as i', 'i.id', '=', 'pr.ingredient_id')
                ->where('pr.product_id', $saleItem->product_id)
                ->select(
                    'pr.ingredient_id',
                    'pr.quantity',          // sudah scaled
                    'pr.unit',
                    'i.name as ingredient_name',
                    'i.code as ingredient_code',
                )
                ->get()
                ->map(fn ($r) => (object) array_merge((array) $r, ['source' => 'product']));

            if ($rows->isNotEmpty()) return $rows;
        }

        // ── OPSI 2: variant_recipes (base 30ml, perlu di-scale) ──────────────
        if ($variantId && $intensityId) {
            return DB::table('variant_recipes as vr')
                ->join('ingredients as i', 'i.id', '=', 'vr.ingredient_id')
                ->where('vr.variant_id', $variantId)
                ->where('vr.intensity_id', $intensityId)
                ->select(
                    'vr.ingredient_id',
                    'vr.base_quantity',     // base 30ml, butuh scaling
                    'vr.unit',
                    'i.name as ingredient_name',
                    'i.code as ingredient_code',
                )
                ->get()
                ->map(fn ($r) => (object) array_merge((array) $r, ['source' => 'variant']));
        }

        return collect();
    }

    /**
     * Kurangi store_ingredient_stocks dan catat di stock_movements.
     */
    private function deductIngredientStock(
        Sale   $sale,
        string $storeId,
        string $ingredientId,
        ?string $ingredientName,
        ?string $ingredientCode,
        string $ingredientUnit,
        float  $qty,
    ): void {
        // ── Upsert stok toko (buat jika belum ada) ───────────────────────────
        $stock = StoreIngredientStock::firstOrCreate(
            ['store_id' => $storeId, 'ingredient_id' => $ingredientId],
            ['quantity' => 0, 'average_cost' => 0, 'total_value' => 0],
        );

        $before = (float) $stock->quantity;
        $after  = $before - $qty;

        // ── Update stok ───────────────────────────────────────────────────────
        $stock->quantity     = $after;
        $stock->total_value  = max(0, $after * (float) $stock->average_cost);
        $stock->last_out_at  = now();
        $stock->last_out_by  = Auth::id();
        $stock->last_out_qty = (int) ceil($qty);
        $stock->save();

        // ── Warning jika stok negatif ─────────────────────────────────────────
        if ($after < 0) {
            Log::warning("[StockDeduction] Stok ingredient NEGATIF", [
                'store_id'      => $storeId,
                'ingredient_id' => $ingredientId,
                'before'        => $before,
                'after'         => $after,
                'sale_number'   => $sale->sale_number,
            ]);
        }

        // ── Catat di stock_movements ──────────────────────────────────────────
        StockMovement::create([
            'reference_type'  => Sale::class,
            'reference_id'    => $sale->id,
            'type'            => 'sale_deduction',
            'store_id'        => $storeId,
            'warehouse_id'    => null,
            'item_type'       => 'ingredient',
            'item_id'         => $ingredientId,
            'item_name'       => $ingredientName,
            'item_code'       => $ingredientCode,
            'item_unit'       => $ingredientUnit,
            'quantity'        => -$qty,          // NEGATIF = keluar
            'quantity_before' => $before,
            'quantity_after'  => $after,
            'unit_cost'       => $stock->average_cost,
            'total_cost'      => round($qty * (float) $stock->average_cost, 2),
            'created_by'      => Auth::id(),
            'notes'           => "Penjualan {$sale->sale_number}",
        ]);
    }

    // =========================================================================
    // PRIVATE — PACKAGING DEDUCTION
    // =========================================================================

    /**
     * Kurangi store_packaging_stocks dan catat di stock_movements.
     */
    private function deductPackagingMaterial(
        Sale   $sale,
        string $storeId,
        string $packagingMaterialId,
        ?string $packagingName,
        ?string $packagingCode,
        int    $qty,
    ): void {
        // ── Upsert stok packaging di toko ────────────────────────────────────
        $stock = StorePackagingStock::firstOrCreate(
            ['store_id' => $storeId, 'packaging_material_id' => $packagingMaterialId],
            ['quantity' => 0, 'average_cost' => 0, 'total_value' => 0],
        );

        $before = (int) $stock->quantity;
        $after  = $before - $qty;

        // ── Update stok ───────────────────────────────────────────────────────
        $stock->quantity     = $after;
        $stock->total_value  = max(0, $after * (float) $stock->average_cost);
        $stock->last_out_at  = now();
        $stock->last_out_by  = Auth::id();
        $stock->last_out_qty = $qty;
        $stock->save();

        // ── Warning jika stok negatif ─────────────────────────────────────────
        if ($after < 0) {
            Log::warning("[StockDeduction] Stok packaging NEGATIF", [
                'store_id'             => $storeId,
                'packaging_material_id'=> $packagingMaterialId,
                'before'               => $before,
                'after'                => $after,
                'sale_number'          => $sale->sale_number,
            ]);
        }

        // ── Catat di stock_movements ──────────────────────────────────────────
        // Ambil average_cost dari packaging master jika stok baru dibuat
        $unitCost = (float) $stock->average_cost;
        if ($unitCost === 0.0) {
            $unitCost = (float) PackagingMaterial::where('id', $packagingMaterialId)
                ->value('average_cost') ?? 0;
        }

        StockMovement::create([
            'reference_type'  => Sale::class,
            'reference_id'    => $sale->id,
            'type'            => 'sale_deduction',
            'store_id'        => $storeId,
            'warehouse_id'    => null,
            'item_type'       => 'packaging',
            'item_id'         => $packagingMaterialId,
            'item_name'       => $packagingName,
            'item_code'       => $packagingCode,
            'item_unit'       => 'pcs',
            'quantity'        => -$qty,          // NEGATIF = keluar
            'quantity_before' => $before,
            'quantity_after'  => $after,
            'unit_cost'       => $unitCost,
            'total_cost'      => round($qty * $unitCost, 2),
            'created_by'      => Auth::id(),
            'notes'           => "Penjualan {$sale->sale_number}",
        ]);
    }
}
