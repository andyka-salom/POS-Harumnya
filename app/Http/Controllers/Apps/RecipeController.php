<?php

namespace App\Http\Controllers\Apps;

use App\Models\Variant;
use App\Models\Intensity;
use App\Models\Size;
use App\Models\Ingredient;
use App\Models\VariantRecipe;
use App\Models\Product;
use App\Models\ProductRecipe;
use App\Models\IntensitySizeQuantity;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RecipeController extends Controller
{
    // ─── Index ────────────────────────────────────────────────────────────────

    public function index()
    {
        $variantRecipes = VariantRecipe::with(['variant', 'intensity', 'ingredient.category'])
            ->select('variant_id', 'intensity_id')
            ->selectRaw('COUNT(*) as ingredient_count')
            ->selectRaw('SUM(base_quantity) as total_volume')
            ->groupBy('variant_id', 'intensity_id')
            ->get()
            ->map(function ($item) {
                // Load recipes dengan eager-load category untuk ingredient_type
                $recipes = VariantRecipe::with('ingredient.category')
                    ->where('variant_id', $item->variant_id)
                    ->where('intensity_id', $item->intensity_id)
                    ->get();

                // IntensitySizeQuantity untuk semua size yang aktif
                $sizeQuantities = IntensitySizeQuantity::with('size')
                    ->where('intensity_id', $item->intensity_id)
                    ->where('is_active', true)
                    ->get()
                    ->sortBy('size.volume_ml');

                return [
                    'variant'          => $item->variant,
                    'intensity'        => $item->intensity,
                    'ingredient_count' => $item->ingredient_count,
                    'total_volume'     => $item->total_volume,
                    'recipes'          => $recipes,
                    'variant_id'       => $item->variant_id,
                    'intensity_id'     => $item->intensity_id,
                    // Preview scaling — menggunakan scaleCollection per size
                    'size_scaling'     => $sizeQuantities->map(fn($q) => [
                        'size_id'      => $q->size->id,
                        'size_name'    => $q->size->name,
                        'volume_ml'    => $q->size->volume_ml,
                        'total_volume' => $q->total_volume,
                        'oil_quantity'     => $q->oil_quantity,
                        'alcohol_quantity' => $q->alcohol_quantity,
                        'other_quantity'   => $q->other_quantity ?? 0,
                        'ingredients'  => $this->buildScaledIngredients($recipes, $q),
                    ])->values(),
                ];
            });

        return Inertia::render('Dashboard/Recipes/Index', [
            'variantRecipes' => $variantRecipes,
        ]);
    }

    // ─── Create ───────────────────────────────────────────────────────────────

    public function create()
    {
        $intensities = Intensity::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'oil_ratio', 'alcohol_ratio']);

        // Kirim IntensitySizeQuantity per intensity ke frontend
        // Format: array of { intensity_id, size, oil_quantity, alcohol_quantity, other_quantity, total_volume }
        // Sengaja dikirim sebagai flat array (bukan grouped object) agar tidak ada masalah
        // saat PHP associative array di-JSON-encode kehilangan UUID key-nya.
        // Di frontend, filter berdasarkan intensity_id yang dipilih.
        $intensitySizeQuantities = IntensitySizeQuantity::with('size:id,name,volume_ml')
            ->where('is_active', true)
            ->get()
            ->sortBy('size.volume_ml')
            ->map(fn($q) => [
                'intensity_id'     => $q->intensity_id,
                'size'             => $q->size,
                'oil_quantity'     => (int) $q->oil_quantity,
                'alcohol_quantity' => (int) $q->alcohol_quantity,
                'other_quantity'   => (int) ($q->other_quantity ?? 0),
                'total_volume'     => (int) $q->total_volume,
            ])->values()->toArray();

        return Inertia::render('Dashboard/Recipes/Create', [
            'variants'   => Variant::where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'code', 'name', 'gender']),
            'intensities' => $intensities,
            // Eager-load category untuk tampilkan ingredient_type di form
            'ingredients' => Ingredient::with('category:id,name,ingredient_type')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'unit', 'ingredient_category_id']),
            // Map intensity_id → array of size quantities untuk preview scaling di frontend
            'intensitySizeQuantities' => $intensitySizeQuantities,
        ]);
    }

    // ─── Store ────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $request->validate([
            'variant_id'               => 'required|exists:variants,id',
            'intensity_id'             => 'required|exists:intensities,id',
            'items'                    => 'required|array|min:1',
            'items.*.ingredient_id'    => 'required|exists:ingredients,id',
            'items.*.base_quantity'    => 'required|numeric|min:0.01',
            'items.*.unit'             => 'nullable|string|max:50',
            'items.*.notes'            => 'nullable|string|max:255',
        ]);

        // Cek duplikat kombinasi
        $exists = VariantRecipe::where('variant_id', $request->variant_id)
            ->where('intensity_id', $request->intensity_id)
            ->exists();

        DB::transaction(function () use ($request) {
            // Hapus dulu jika sudah ada (overwrite)
            VariantRecipe::where('variant_id', $request->variant_id)
                ->where('intensity_id', $request->intensity_id)
                ->delete();

            foreach ($request->items as $item) {
                VariantRecipe::create([
                    'variant_id'    => $request->variant_id,
                    'intensity_id'  => $request->intensity_id,
                    'ingredient_id' => $item['ingredient_id'],
                    'base_quantity' => $item['base_quantity'],
                    'unit'          => $item['unit'] ?? 'ml',
                    'notes'         => $item['notes'] ?? null,
                ]);
            }
        });

        return to_route('recipes.index')
            ->with('success', 'Formula variant berhasil disimpan untuk base 30ml');
    }

    // ─── Show ─────────────────────────────────────────────────────────────────

    public function show($variant_id, $intensity_id)
    {
        // WAJIB eager-load ingredient.category untuk ingredient_type
        $recipes = VariantRecipe::with(['ingredient.category', 'variant', 'intensity'])
            ->where('variant_id', $variant_id)
            ->where('intensity_id', $intensity_id)
            ->get();

        $variant   = Variant::findOrFail($variant_id);
        $intensity = Intensity::findOrFail($intensity_id);

        return Inertia::render('Dashboard/Recipes/Show', [
            'recipes'     => $recipes,
            'variant'     => $variant,
            'intensity'   => $intensity,
            'sizePreview' => $this->calculateSizePreview($recipes, $intensity_id),
        ]);
    }

    // ─── Edit ─────────────────────────────────────────────────────────────────

    public function edit($variant_id, $intensity_id)
    {
        $recipes   = VariantRecipe::with(['ingredient.category'])
            ->where('variant_id', $variant_id)
            ->where('intensity_id', $intensity_id)
            ->get();

        $variant   = Variant::findOrFail($variant_id);
        $intensity = Intensity::findOrFail($intensity_id);

        // IntensitySizeQuantity untuk intensity ini — dikirim ke frontend untuk preview scaling
        $sizeQuantities = IntensitySizeQuantity::with('size:id,name,volume_ml')
            ->where('intensity_id', $intensity_id)
            ->where('is_active', true)
            ->get()
            ->sortBy('size.volume_ml')
            ->map(fn($q) => [
                'size'             => $q->size,
                'oil_quantity'     => $q->oil_quantity,
                'alcohol_quantity' => $q->alcohol_quantity,
                'other_quantity'   => $q->other_quantity ?? 0,
                'total_volume'     => $q->total_volume,
            ])->values();

        return Inertia::render('Dashboard/Recipes/Edit', [
            'variant'        => $variant,
            'intensity'      => $intensity,
            'recipes'        => $recipes->map(fn($r) => [
                'id'            => $r->id,
                'ingredient_id' => $r->ingredient_id,
                'base_quantity' => $r->base_quantity,
                'unit'          => $r->unit,
                'notes'         => $r->notes,
                'ingredient'    => $r->ingredient,
            ]),
            'variants'       => Variant::where('is_active', true)->get(['id', 'code', 'name']),
            'intensities'    => Intensity::where('is_active', true)->get(['id', 'code', 'name']),
            'ingredients'    => Ingredient::with('category:id,name,ingredient_type')
                ->where('is_active', true)
                ->get(['id', 'code', 'name', 'unit', 'ingredient_category_id']),
            // Array of { size, oil_quantity, alcohol_quantity, other_quantity, total_volume }
            // untuk preview scaling akurat (LRM per ingredient_type) di Edit form
            'sizeQuantities' => $sizeQuantities,
        ]);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    public function update(Request $request, $variant_id, $intensity_id)
    {
        $request->validate([
            'items'                    => 'required|array|min:1',
            'items.*.ingredient_id'    => 'required|exists:ingredients,id',
            'items.*.base_quantity'    => 'required|numeric|min:0.01',
            'items.*.unit'             => 'nullable|string|max:50',
            'items.*.notes'            => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($request, $variant_id, $intensity_id) {
            VariantRecipe::where('variant_id', $variant_id)
                ->where('intensity_id', $intensity_id)
                ->delete();

            foreach ($request->items as $item) {
                VariantRecipe::create([
                    'variant_id'    => $variant_id,
                    'intensity_id'  => $intensity_id,
                    'ingredient_id' => $item['ingredient_id'],
                    'base_quantity' => $item['base_quantity'],
                    'unit'          => $item['unit'] ?? 'ml',
                    'notes'         => $item['notes'] ?? null,
                ]);
            }
        });

        return to_route('recipes.index')
            ->with('success', 'Formula variant berhasil diupdate');
    }

    // ─── Destroy ──────────────────────────────────────────────────────────────

    public function destroy($variant_id, $intensity_id)
    {
        DB::transaction(function () use ($variant_id, $intensity_id) {
            VariantRecipe::where('variant_id', $variant_id)
                ->where('intensity_id', $intensity_id)
                ->delete();
        });

        return back()->with('success', 'Formula variant berhasil dihapus');
    }

    // ─── Private: calculateSizePreview ────────────────────────────────────────

    /**
     * Hitung preview scaling per size menggunakan ingredient_type.
     *
     * Flow:
     *   - Tiap bahan dikelompokkan berdasarkan ingredient_type kategorinya
     *   - oil      → di-scale ke oil_quantity dari IntensitySizeQuantity
     *   - alcohol  → di-scale ke alcohol_quantity
     *   - other    → di-scale ke other_quantity (0 jika belum dikonfigurasi)
     *   - LRM diterapkan per grup agar total tiap tipe selalu tepat integer
     *
     * Fallback jika IntensitySizeQuantity belum dikonfigurasi:
     *   - Scale proporsional sederhana berdasarkan volume_ml size
     *
     * @param  \Illuminate\Support\Collection $recipes    VariantRecipe collection
     *                                                     (wajib eager-load ingredient.category)
     * @param  string                         $intensityId
     */
    private function calculateSizePreview($recipes, string $intensityId): array
    {
        $sizes = Size::where('is_active', true)->orderBy('volume_ml')->get();

        return $sizes->map(function ($size) use ($recipes, $intensityId) {
            $intensityQty = IntensitySizeQuantity::getFor($intensityId, $size->id);

            if (!$intensityQty) {
                // Fallback tanpa kalibrasi
                $baseTotalVolume = $recipes->sum(fn($r) => (float) $r->base_quantity);
                return [
                    'size'          => $size,
                    'total_volume'  => $size->volume_ml,
                    'is_calibrated' => false,
                    'ingredients'   => $recipes->map(fn($recipe) => [
                        'ingredient'        => $recipe->ingredient,
                        'ingredient_type'   => $recipe->ingredient->category->ingredient_type ?? 'other',
                        'original_quantity' => (float) $recipe->base_quantity,
                        'scaled_quantity'   => $recipe->getFallbackScaledQty($baseTotalVolume, $size->volume_ml),
                        'unit'              => $recipe->unit,
                    ])->values(),
                ];
            }

            // Scale menggunakan ingredient_type + LRM per grup
            $scaledMap = VariantRecipe::scaleCollection($recipes, $intensityQty);

            return [
                'size'             => $size,
                'total_volume'     => $intensityQty->total_volume,
                'is_calibrated'    => true,
                'oil_quantity'     => $intensityQty->oil_quantity,
                'alcohol_quantity' => $intensityQty->alcohol_quantity,
                'other_quantity'   => $intensityQty->other_quantity ?? 0,
                'ingredients'      => $recipes->map(function ($recipe, $idx) use ($scaledMap) {
                    return [
                        'ingredient'        => $recipe->ingredient,
                        'ingredient_type'   => $recipe->ingredient->category->ingredient_type ?? 'other',
                        'original_quantity' => (float) $recipe->base_quantity,
                        'scaled_quantity'   => $scaledMap[$idx] ?? 0,
                        'unit'              => $recipe->unit,
                    ];
                })->values(),
            ];
        })->toArray();
    }

    // ─── Private: buildScaledIngredients ─────────────────────────────────────

    /**
     * Helper untuk index() — membangun array ingredient dengan scaled_quantity
     * untuk ditampilkan di ScalingPreviewTable di halaman Index.
     */
    private function buildScaledIngredients($recipes, IntensitySizeQuantity $intensityQty): array
    {
        $scaledMap = VariantRecipe::scaleCollection($recipes, $intensityQty);

        return $recipes->map(function ($recipe, $idx) use ($scaledMap) {
            return [
                'ingredient_id'   => $recipe->ingredient_id,
                'name'            => $recipe->ingredient->name ?? '—',
                'ingredient_type' => $recipe->ingredient->category->ingredient_type ?? 'other',
                'scaled_quantity' => $scaledMap[$idx] ?? 0,
                'unit'            => $recipe->unit,
            ];
        })->values()->toArray();
    }

    // ─── Public: generateProducts (dipanggil via tombol di UI) ─────────────────

    /**
     * Generate products dari variant recipe untuk semua sizes yang terkalibrasi.
     *
     * Endpoint: POST /recipes/{variant}/{intensity}/generate-products
     *
     * Parameter request opsional:
     *   - regenerate (bool): jika true, hapus product yang sudah ada lalu buat ulang
     *
     * Response JSON:
     *   - generated: jumlah product baru yang dibuat
     *   - skipped:   jumlah size yang dilewati (sudah ada / belum terkalibrasi / belum ada harga)
     *   - details:   array info per size
     */
    public function generateProducts(Request $request, string $variant_id, string $intensity_id)
    {
        $request->validate([
            'regenerate' => 'boolean',
        ]);

        $regenerate = (bool) $request->input('regenerate', false);
        $variant    = Variant::findOrFail($variant_id);
        $intensity  = Intensity::findOrFail($intensity_id);
        $sizes      = Size::where('is_active', true)->get();

        // Wajib eager-load ingredient.category untuk ingredient_type
        $recipes = VariantRecipe::with('ingredient.category')
            ->where('variant_id', $variant_id)
            ->where('intensity_id', $intensity_id)
            ->get();

        if ($recipes->isEmpty()) {
            return back()->with('error', 'Formula belum ada — buat formula terlebih dahulu.');
        }

        $generated = 0;
        $skipped   = 0;
        $details   = [];

        DB::transaction(function () use (
            $sizes, $variant, $intensity, $variant_id, $intensity_id,
            $recipes, $regenerate, &$generated, &$skipped, &$details
        ) {
            foreach ($sizes as $size) {
                $existingProduct = Product::where('variant_id', $variant_id)
                    ->where('intensity_id', $intensity_id)
                    ->where('size_id', $size->id)
                    ->first();

                // Jika sudah ada dan tidak regenerate → skip
                if ($existingProduct && !$regenerate) {
                    $skipped++;
                    $details[] = [
                        'size'   => $size->name,
                        'status' => 'skipped',
                        'reason' => 'Product sudah ada (gunakan Regenerate untuk buat ulang)',
                    ];
                    continue;
                }

                // Ambil harga jual
                $priceRecord = DB::table('intensity_size_prices')
                    ->where('intensity_id', $intensity_id)
                    ->where('size_id', $size->id)
                    ->where('is_active', true)
                    ->first();

                if (!$priceRecord) {
                    $skipped++;
                    $details[] = [
                        'size'   => $size->name,
                        'status' => 'skipped',
                        'reason' => 'Harga jual belum dikonfigurasi di IntensitySizePrices',
                    ];
                    continue;
                }

                // IntensitySizeQuantity WAJIB ada agar scaling akurat
                $intensityQty = IntensitySizeQuantity::getFor($intensity_id, $size->id);
                if (!$intensityQty) {
                    $skipped++;
                    $details[] = [
                        'size'   => $size->name,
                        'status' => 'skipped',
                        'reason' => 'Kalibrasi IntensitySizeQuantity belum dikonfigurasi',
                    ];
                    continue;
                }

                // Jika regenerate → hapus product & recipes lama
                if ($existingProduct && $regenerate) {
                    $existingProduct->recipes()->delete();
                    $existingProduct->delete();
                }

                // Scale semua bahan sekaligus (LRM per ingredient_type)
                $scaledMap = VariantRecipe::scaleCollection($recipes, $intensityQty);

                // Buat product
                $product = Product::create([
                    'sku'           => $this->generateSKU($variant, $intensity, $size),
                    'variant_id'    => $variant_id,
                    'intensity_id'  => $intensity_id,
                    'size_id'       => $size->id,
                    'name'          => "{$variant->name} - {$intensity->code} - {$size->name}",
                    'selling_price' => $priceRecord->price,
                    'is_active'     => true,
                ]);

                // Buat product_recipes
                foreach ($recipes as $idx => $recipe) {
                    $scaledQty  = $scaledMap[$idx] ?? 0;
                    $ingredient = $recipe->ingredient;

                    ProductRecipe::create([
                        'product_id'    => $product->id,
                        'ingredient_id' => $recipe->ingredient_id,
                        'quantity'      => $scaledQty,
                        'unit'          => $recipe->unit,
                        'unit_cost'     => $ingredient->average_cost ?? 0,
                        'total_cost'    => $scaledQty * ($ingredient->average_cost ?? 0),
                    ]);
                }

                $product->calculateProductionCost();

                $generated++;
                $details[] = [
                    'size'    => $size->name,
                    'status'  => 'generated',
                    'sku'     => $product->sku,
                    'recipes' => $recipes->count(),
                ];
            }
        });

        $message = $generated > 0
            ? "{$generated} product berhasil di-generate" . ($skipped > 0 ? ", {$skipped} dilewati" : "")
            : "Tidak ada product baru — {$skipped} size dilewati";

        return back()->with($generated > 0 ? 'success' : 'warning', $message)
                     ->with('generateDetails', $details);
    }

    // ─── Private: generateSKU ────────────────────────────────────────────────

    private function generateSKU($variant, $intensity, $size): string
    {
        // Format: {VARIANT_CODE}-{INTENSITY_CODE}-{VOLUME}
        // Contoh:  AVE-EDP-50
        return sprintf(
            '%s-%s-%d',
            strtoupper(substr($variant->code, 0, 3)),
            strtoupper($intensity->code),
            $size->volume_ml
        );
    }
}
