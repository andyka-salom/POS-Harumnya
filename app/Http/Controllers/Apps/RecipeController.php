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
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;

class RecipeController extends Controller
{
    // =========================================================================
    // INDEX
    // =========================================================================

    public function index()
    {
        $variantRecipes = VariantRecipe::with(['variant', 'intensity', 'ingredient.category'])
            ->select('variant_id', 'intensity_id')
            ->selectRaw('COUNT(*) as ingredient_count')
            ->selectRaw('SUM(base_quantity) as total_volume')
            ->groupBy('variant_id', 'intensity_id')
            ->get()
            ->map(function ($item) {
                $recipes = VariantRecipe::with('ingredient.category')
                    ->where('variant_id', $item->variant_id)
                    ->where('intensity_id', $item->intensity_id)
                    ->get();

                $sizeQuantities = IntensitySizeQuantity::with('size')
                    ->where('intensity_id', $item->intensity_id)
                    ->where('is_active', true)
                    ->get()
                    ->sortBy('size.volume_ml');

                // Cek apakah sudah ada product yang di-generate
                $generatedSizes = Product::where('variant_id', $item->variant_id)
                    ->where('intensity_id', $item->intensity_id)
                    ->pluck('size_id')
                    ->toArray();

                return [
                    'variant'          => $item->variant,
                    'intensity'        => $item->intensity,
                    'ingredient_count' => $item->ingredient_count,
                    'total_volume'     => $item->total_volume,
                    'recipes'          => $recipes,
                    'variant_id'       => $item->variant_id,
                    'intensity_id'     => $item->intensity_id,
                    'generated_sizes'  => $generatedSizes,
                    'is_generated'     => count($generatedSizes) > 0,
                    'size_scaling'     => $sizeQuantities->map(fn($q) => [
                        'size_id'          => $q->size->id,
                        'size_name'        => $q->size->name,
                        'volume_ml'        => $q->size->volume_ml,
                        'total_volume'     => $q->total_volume,
                        'oil_quantity'     => $q->oil_quantity,
                        'alcohol_quantity' => $q->alcohol_quantity,
                        'other_quantity'   => $q->other_quantity ?? 0,
                        'ingredients'      => $this->buildScaledIngredients($recipes, $q),
                    ])->values(),
                ];
            });

        return Inertia::render('Dashboard/Recipes/Index', [
            'variantRecipes' => $variantRecipes,
        ]);
    }

    // =========================================================================
    // CREATE
    // =========================================================================

    public function create()
    {
        $intensities = Intensity::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'oil_ratio', 'alcohol_ratio']);

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
            'intensities'             => $intensities,
            'ingredients'             => Ingredient::with('category:id,name,ingredient_type')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'unit', 'ingredient_category_id']),
            'intensitySizeQuantities' => $intensitySizeQuantities,
        ]);
    }

    // =========================================================================
    // STORE
    // =========================================================================

    public function store(Request $request)
    {
        $validated = $request->validate([
            'variant_id'            => 'required|exists:variants,id',
            'intensity_id'          => 'required|exists:intensities,id',
            'items'                 => 'required|array|min:1',
            'items.*.ingredient_id' => 'required|exists:ingredients,id',
            'items.*.base_quantity' => 'required|numeric|min:0.01',
            'items.*.unit'          => 'nullable|string|max:50',
            'items.*.notes'         => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($validated) {
            VariantRecipe::where('variant_id', $validated['variant_id'])
                ->where('intensity_id', $validated['intensity_id'])
                ->delete();

            foreach ($validated['items'] as $item) {
                VariantRecipe::create([
                    'variant_id'    => $validated['variant_id'],
                    'intensity_id'  => $validated['intensity_id'],
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

    // =========================================================================
    // SHOW
    // =========================================================================

    public function show($variant_id, $intensity_id)
    {
        $recipes = VariantRecipe::with(['ingredient.category', 'variant', 'intensity'])
            ->where('variant_id', $variant_id)
            ->where('intensity_id', $intensity_id)
            ->get();

        if ($recipes->isEmpty()) {
            abort(404, 'Formula tidak ditemukan.');
        }

        $variant   = Variant::findOrFail($variant_id);
        $intensity = Intensity::findOrFail($intensity_id);

        return Inertia::render('Dashboard/Recipes/Show', [
            'recipes'     => $recipes,
            'variant'     => $variant,
            'intensity'   => $intensity,
            'sizePreview' => $this->calculateSizePreview($recipes, $intensity_id),
        ]);
    }

    // =========================================================================
    // EDIT
    // =========================================================================

    public function edit($variant_id, $intensity_id)
    {
        $recipes   = VariantRecipe::with(['ingredient.category'])
            ->where('variant_id', $variant_id)
            ->where('intensity_id', $intensity_id)
            ->get();

        if ($recipes->isEmpty()) {
            abort(404, 'Formula tidak ditemukan.');
        }

        $variant   = Variant::findOrFail($variant_id);
        $intensity = Intensity::findOrFail($intensity_id);

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
            'sizeQuantities' => $sizeQuantities,
        ]);
    }

    // =========================================================================
    // UPDATE
    // =========================================================================

    public function update(Request $request, $variant_id, $intensity_id)
    {
        $validated = $request->validate([
            'items'                 => 'required|array|min:1',
            'items.*.ingredient_id' => 'required|exists:ingredients,id',
            'items.*.base_quantity' => 'required|numeric|min:0.01',
            'items.*.unit'          => 'nullable|string|max:50',
            'items.*.notes'         => 'nullable|string|max:255',
        ]);

        // Pastikan variant & intensity ada
        Variant::findOrFail($variant_id);
        Intensity::findOrFail($intensity_id);

        DB::transaction(function () use ($validated, $variant_id, $intensity_id) {
            VariantRecipe::where('variant_id', $variant_id)
                ->where('intensity_id', $intensity_id)
                ->delete();

            foreach ($validated['items'] as $item) {
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

    // =========================================================================
    // DESTROY
    // =========================================================================

    public function destroy($variant_id, $intensity_id)
    {
        $exists = VariantRecipe::where('variant_id', $variant_id)
            ->where('intensity_id', $intensity_id)
            ->exists();

        if (!$exists) {
            return back()->with('error', 'Formula tidak ditemukan.');
        }

        DB::transaction(function () use ($variant_id, $intensity_id) {
            VariantRecipe::where('variant_id', $variant_id)
                ->where('intensity_id', $intensity_id)
                ->delete();
        });

        return back()->with('success', 'Formula variant berhasil dihapus');
    }

    // =========================================================================
    // GENERATE PRODUCTS
    // =========================================================================

    public function generateProducts(Request $request, string $variant_id, string $intensity_id)
    {
        $request->validate([
            'regenerate' => 'boolean',
        ]);

        $regenerate = (bool) $request->input('regenerate', false);
        $variant    = Variant::findOrFail($variant_id);
        $intensity  = Intensity::findOrFail($intensity_id);
        $sizes      = Size::where('is_active', true)->get();

        $recipes = VariantRecipe::with('ingredient.category')
            ->where('variant_id', $variant_id)
            ->where('intensity_id', $intensity_id)
            ->get();

        if ($recipes->isEmpty()) {
            return back()->with('error', 'Formula belum ada — buat formula terlebih dahulu.');
        }

        // Jika tidak regenerate, cek apakah semua size sudah di-generate
        if (!$regenerate) {
            $existingCount = Product::where('variant_id', $variant_id)
                ->where('intensity_id', $intensity_id)
                ->count();

            if ($existingCount > 0) {
                return back()->with('warning', 'Products sudah pernah di-generate. Gunakan Regenerate untuk membuat ulang.');
            }
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

                if ($existingProduct && !$regenerate) {
                    $skipped++;
                    $details[] = [
                        'size'   => $size->name,
                        'status' => 'skipped',
                        'reason' => 'Product sudah ada (gunakan Regenerate untuk buat ulang)',
                    ];
                    continue;
                }

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

                if ($existingProduct && $regenerate) {
                    $existingProduct->recipes()->delete();
                    $existingProduct->delete();
                }

                $scaledMap = VariantRecipe::scaleCollection($recipes, $intensityQty);

                $product = Product::create([
                    'sku'           => $this->generateSKU($variant, $intensity, $size),
                    'variant_id'    => $variant_id,
                    'intensity_id'  => $intensity_id,
                    'size_id'       => $size->id,
                    'name'          => "{$variant->name} - {$intensity->code} - {$size->name}",
                    'selling_price' => $priceRecord->price,
                    'is_active'     => true,
                ]);

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

        return back()
            ->with($generated > 0 ? 'success' : 'warning', $message)
            ->with('generateDetails', $details);
    }

    // =========================================================================
    // IMPORT — Download Template
    // =========================================================================

    public function importTemplate()
    {
        $variants    = Variant::where('is_active', true)->orderBy('code')->get(['code', 'name', 'gender']);
        $intensities = Intensity::where('is_active', true)->orderBy('code')->get(['code', 'name', 'oil_ratio', 'alcohol_ratio']);
        $ingredients = Ingredient::where('is_active', true)->orderBy('code')->get(['code', 'name', 'unit']);

        $templatePath = storage_path('app/templates/template_import_variant_recipe.xlsx');

        if (!file_exists($templatePath)) {
            $basePath = public_path('templates/template_import_variant_recipe.xlsx');
            if (!file_exists($basePath)) {
                abort(404, 'Template file tidak ditemukan. Hubungi administrator.');
            }
            if (!is_dir(dirname($templatePath))) {
                mkdir(dirname($templatePath), 0755, true);
            }
            copy($basePath, $templatePath);
        }

        $spreadsheet = IOFactory::load($templatePath);

        $refSheet = $spreadsheet->getSheetByName('Referensi Kode');
        if ($refSheet) {
            $this->fillReferenceSheet($refSheet, $variants, $intensities, $ingredients);
        }

        $dataSheet = $spreadsheet->getSheetByName('Import Data');
        if ($dataSheet) {
            $dataSheet->getCell('A2')->setValue(
                'Isi data sesuai kolom. WAJIB: variant_code, intensity_code, ingredient_code, base_quantity. '
                . 'Template dibuat: ' . now()->format('d/m/Y H:i') . ' WIB. Hapus baris contoh sebelum import.'
            );
        }

        $filename = 'template_import_formula_variant_' . now()->format('Ymd_His') . '.xlsx';
        $tmpDir   = storage_path('app/tmp');
        if (!is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }
        $tmpPath = $tmpDir . '/' . $filename;

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save($tmpPath);

        return response()->download($tmpPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    // =========================================================================
    // IMPORT — Index Page
    // =========================================================================

    public function importIndex()
    {
        return Inertia::render('Dashboard/Recipes/Import');
    }

    // =========================================================================
    // IMPORT — Validate (preview, belum simpan)
    // =========================================================================

    public function importValidate(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:5120',
        ]);

        try {
            $rows   = $this->parseExcel($request->file('file'));
            $result = $this->validateRows($rows);
            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Recipe import validate error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Gagal membaca file Excel: ' . $e->getMessage(),
            ], 422);
        }
    }

    // =========================================================================
    // IMPORT — Store (simpan ke database)
    // =========================================================================

    public function importStore(Request $request)
    {
        $request->validate([
            'file'        => 'required|file|mimes:xlsx,xls|max:5120',
            'overwrite'   => 'boolean',
            'skip_errors' => 'boolean',
        ]);

        $overwrite  = $request->boolean('overwrite', true);
        $skipErrors = $request->boolean('skip_errors', true);

        try {
            $rows   = $this->parseExcel($request->file('file'));
            $result = $this->validateRows($rows);
        } catch (\Exception $e) {
            Log::error('Recipe import store error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal membaca file Excel: ' . $e->getMessage(),
            ], 422);
        }

        // Jika ada error dan mode tidak skip → tolak semua
        if (!$skipErrors && count($result['errors']) > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Import dibatalkan: ditemukan ' . count($result['errors']) . ' baris error. Perbaiki terlebih dahulu.',
                'errors'  => $result['errors'],
                'summary' => $result['summary'],
            ], 422);
        }

        if (count($result['valid_rows']) === 0) {
            return response()->json([
                'success'  => false,
                'message'  => 'Tidak ada baris valid untuk diimport.',
                'errors'   => $result['errors'],
                'summary'  => $result['summary'],
                'imported' => 0,
                'skipped'  => 0,
                'overwritten' => 0,
            ], 422);
        }

        $imported    = 0;
        $skipped     = 0;
        $overwritten = 0;

        try {
            DB::transaction(function () use ($result, $overwrite, &$imported, &$skipped, &$overwritten) {
                // Kelompokkan baris valid per kombinasi variant + intensity
                $groups = [];
                foreach ($result['valid_rows'] as $row) {
                    $key = $row['variant_id'] . '|' . $row['intensity_id'];
                    $groups[$key][] = $row;
                }

                foreach ($groups as $key => $items) {
                    [$variantId, $intensityId] = explode('|', $key);

                    $exists = VariantRecipe::where('variant_id', $variantId)
                        ->where('intensity_id', $intensityId)
                        ->exists();

                    if ($exists && !$overwrite) {
                        $skipped += count($items);
                        continue;
                    }

                    if ($exists) {
                        VariantRecipe::where('variant_id', $variantId)
                            ->where('intensity_id', $intensityId)
                            ->delete();
                        $overwritten++;
                    }

                    foreach ($items as $item) {
                        VariantRecipe::create([
                            'variant_id'    => $variantId,
                            'intensity_id'  => $intensityId,
                            'ingredient_id' => $item['ingredient_id'],
                            'base_quantity' => $item['base_quantity'],
                            'unit'          => $item['unit'],
                            'notes'         => $item['notes'],
                        ]);
                        $imported++;
                    }
                }
            });
        } catch (\Exception $e) {
            Log::error('Recipe import transaction error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menyimpan data: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success'     => true,
            'message'     => "Import selesai: {$imported} baris disimpan, {$skipped} kombinasi dilewati (sudah ada), {$overwritten} kombinasi ditimpa.",
            'imported'    => $imported,
            'skipped'     => $skipped,
            'overwritten' => $overwritten,
            'errors'      => $result['errors'],
            'summary'     => $result['summary'],
        ]);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private function calculateSizePreview($recipes, string $intensityId): array
    {
        $sizes = Size::where('is_active', true)->orderBy('volume_ml')->get();

        return $sizes->map(function ($size) use ($recipes, $intensityId) {
            $intensityQty = IntensitySizeQuantity::getFor($intensityId, $size->id);

            if (!$intensityQty) {
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

    private function generateSKU($variant, $intensity, $size): string
    {
        return sprintf(
            '%s-%s-%d',
            strtoupper(substr($variant->code, 0, 3)),
            strtoupper($intensity->code),
            $size->volume_ml
        );
    }

    // ─── Import: Parse Excel ──────────────────────────────────────────────────

    private function parseExcel($file): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet       = $spreadsheet->getSheetByName('Import Data') ?? $spreadsheet->getActiveSheet();

        $rows     = [];
        $maxRow   = $sheet->getHighestDataRow();
        $startRow = 4; // baris 1-2: title/info, baris 3: header, baris 4+: data

        for ($r = $startRow; $r <= $maxRow; $r++) {
            $variantCode    = trim((string) $sheet->getCell("A{$r}")->getValue());
            $intensityCode  = trim((string) $sheet->getCell("B{$r}")->getValue());
            $ingredientCode = trim((string) $sheet->getCell("C{$r}")->getValue());
            $baseQuantity   = $sheet->getCell("D{$r}")->getValue();
            $unit           = trim((string) ($sheet->getCell("E{$r}")->getValue() ?? 'ml')) ?: 'ml';
            $notes          = trim((string) ($sheet->getCell("F{$r}")->getValue() ?? ''));

            // Skip baris kosong
            if ($variantCode === '' && $intensityCode === '' && $ingredientCode === '') {
                continue;
            }

            $rows[] = [
                'row'             => $r,
                'variant_code'    => $variantCode,
                'intensity_code'  => $intensityCode,
                'ingredient_code' => $ingredientCode,
                'base_quantity'   => $baseQuantity,
                'unit'            => $unit,
                'notes'           => $notes,
            ];
        }

        return $rows;
    }

    // ─── Import: Validate Rows ────────────────────────────────────────────────

    private function validateRows(array $rows): array
    {
        $variants    = Variant::where('is_active', true)->pluck('id', 'code');
        $intensities = Intensity::where('is_active', true)->pluck('id', 'code');
        $ingredients = Ingredient::where('is_active', true)->pluck('id', 'code');

        $validRows = [];
        $errorRows = [];
        $groupQty  = []; // key: variant_code|intensity_code → total_qty

        foreach ($rows as $row) {
            $rowErrors = [];

            if (empty($row['variant_code'])) {
                $rowErrors[] = 'variant_code wajib diisi';
            } elseif (!$variants->has($row['variant_code'])) {
                $rowErrors[] = "variant_code '{$row['variant_code']}' tidak ditemukan";
            }

            if (empty($row['intensity_code'])) {
                $rowErrors[] = 'intensity_code wajib diisi';
            } elseif (!$intensities->has($row['intensity_code'])) {
                $rowErrors[] = "intensity_code '{$row['intensity_code']}' tidak ditemukan";
            }

            if (empty($row['ingredient_code'])) {
                $rowErrors[] = 'ingredient_code wajib diisi';
            } elseif (!$ingredients->has($row['ingredient_code'])) {
                $rowErrors[] = "ingredient_code '{$row['ingredient_code']}' tidak ditemukan";
            }

            $qty = is_numeric($row['base_quantity']) ? (float) $row['base_quantity'] : null;
            if ($qty === null) {
                $rowErrors[] = 'base_quantity harus angka';
            } elseif ($qty <= 0) {
                $rowErrors[] = 'base_quantity harus > 0';
            }

            if (!empty($rowErrors)) {
                $errorRows[] = [
                    'row'    => $row['row'],
                    'data'   => $row,
                    'errors' => $rowErrors,
                ];
                continue;
            }

            $groupKey            = $row['variant_code'] . '|' . $row['intensity_code'];
            $groupQty[$groupKey] = ($groupQty[$groupKey] ?? 0) + $qty;

            $validRows[] = array_merge($row, [
                'variant_id'    => $variants->get($row['variant_code']),
                'intensity_id'  => $intensities->get($row['intensity_code']),
                'ingredient_id' => $ingredients->get($row['ingredient_code']),
                'base_quantity' => $qty,
            ]);
        }

        // Warning jika total per kombinasi ≠ 30ml
        $volumeWarnings = [];
        foreach ($groupQty as $key => $total) {
            if (abs($total - 30) > 0.5) {
                [$vc, $ic] = explode('|', $key);
                $volumeWarnings[] = "Kombinasi {$vc} + {$ic}: total base_quantity = {$total}ml (seharusnya 30ml)";
            }
        }

        // Summary per kombinasi
        $summary = [];
        $grouped = collect($validRows)->groupBy(fn($r) => $r['variant_code'] . ' + ' . $r['intensity_code']);
        foreach ($grouped as $combo => $items) {
            $total     = $items->sum('base_quantity');
            $summary[] = [
                'combination'      => $combo,
                'ingredient_count' => $items->count(),
                'total_volume'     => round($total, 2),
                'is_valid_volume'  => abs($total - 30) <= 0.5,
            ];
        }

        return [
            'valid_rows'      => $validRows,
            'errors'          => $errorRows,
            'volume_warnings' => $volumeWarnings,
            'summary'         => $summary,
            'total_rows'      => count($rows),
            'valid_count'     => count($validRows),
            'error_count'     => count($errorRows),
        ];
    }

    // ─── Import: Fill Reference Sheet ─────────────────────────────────────────

    private function fillReferenceSheet($sheet, $variants, $intensities, $ingredients): void
    {
        $headerStyle = [
            'font' => ['bold' => true, 'size' => 9, 'color' => ['rgb' => '1E293B']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'EEF2FF']],
        ];
        $dataStyle = [
            'font'      => ['size' => 9],
            'alignment' => ['vertical' => 'center'],
        ];

        $row = 2;

        // Variant section
        $sheet->setCellValue("A{$row}", 'KODE VARIANT');
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->getStyle("A{$row}")->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => 'solid', 'startColor' => ['rgb' => '7C3AED']],
            'alignment' => ['horizontal' => 'center'],
        ]);
        $row++;

        foreach (['A' => 'Kode', 'B' => 'Nama Variant', 'C' => 'Gender'] as $col => $label) {
            $sheet->setCellValue("{$col}{$row}", $label);
            $sheet->getStyle("{$col}{$row}")->applyFromArray($headerStyle);
        }
        $row++;

        foreach ($variants as $v) {
            $sheet->setCellValue("A{$row}", $v->code);
            $sheet->setCellValue("B{$row}", $v->name);
            $sheet->setCellValue("C{$row}", $v->gender);
            $sheet->getStyle("A{$row}:C{$row}")->applyFromArray($dataStyle);
            $row++;
        }
        $row++;

        // Intensity section
        $sheet->setCellValue("A{$row}", 'KODE INTENSITAS');
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->getStyle("A{$row}")->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => 'solid', 'startColor' => ['rgb' => '0369A1']],
            'alignment' => ['horizontal' => 'center'],
        ]);
        $row++;

        foreach (['A' => 'Kode', 'B' => 'Nama Intensitas', 'C' => 'Rasio (Oil:Alcohol)'] as $col => $label) {
            $sheet->setCellValue("{$col}{$row}", $label);
            $sheet->getStyle("{$col}{$row}")->applyFromArray($headerStyle);
        }
        $row++;

        foreach ($intensities as $i) {
            $sheet->setCellValue("A{$row}", $i->code);
            $sheet->setCellValue("B{$row}", $i->name);
            $sheet->setCellValue("C{$row}", "{$i->oil_ratio}:{$i->alcohol_ratio}");
            $sheet->getStyle("A{$row}:C{$row}")->applyFromArray($dataStyle);
            $row++;
        }
        $row++;

        // Ingredient section
        $sheet->setCellValue("A{$row}", 'KODE BAHAN BAKU');
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->getStyle("A{$row}")->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => 'solid', 'startColor' => ['rgb' => '065F46']],
            'alignment' => ['horizontal' => 'center'],
        ]);
        $row++;

        foreach (['A' => 'Kode', 'B' => 'Nama Bahan', 'C' => 'Satuan'] as $col => $label) {
            $sheet->setCellValue("{$col}{$row}", $label);
            $sheet->getStyle("{$col}{$row}")->applyFromArray($headerStyle);
        }
        $row++;

        foreach ($ingredients as $ing) {
            $sheet->setCellValue("A{$row}", $ing->code);
            $sheet->setCellValue("B{$row}", $ing->name);
            $sheet->setCellValue("C{$row}", $ing->unit);
            $sheet->getStyle("A{$row}:C{$row}")->applyFromArray($dataStyle);
            $row++;
        }
    }
}
