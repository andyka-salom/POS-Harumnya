<?php

namespace App\Http\Controllers\Apps;

use App\Models\Variant;
use App\Models\Intensity;
use App\Models\Ingredient;
use App\Models\VariantRecipe;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;

class RecipeImportController extends Controller
{
    // -------------------------------------------------------------------------
    // Download Template
    // -------------------------------------------------------------------------

    /**
     * Generate dan download template Excel yang sudah terisi kode-kode
     * variant, intensity, ingredient dari database saat ini.
     */
    public function downloadTemplate()
    {
        // Ambil data referensi
        $variants    = Variant::where('is_active', true)->orderBy('code')->get(['code', 'name', 'gender']);
        $intensities = Intensity::where('is_active', true)->orderBy('code')->get(['code', 'name', 'oil_ratio', 'alcohol_ratio']);
        $ingredients = Ingredient::where('is_active', true)->orderBy('code')->get(['code', 'name', 'unit']);

        $templatePath = storage_path('app/templates/template_import_variant_recipe.xlsx');

        // Jika template base belum ada di storage, generate dari public
        if (!file_exists($templatePath)) {
            $basePath = public_path('templates/template_import_variant_recipe.xlsx');
            if (!file_exists($basePath)) {
                abort(404, 'Template file tidak ditemukan.');
            }
            copy($basePath, $templatePath);
        }

        // Load template dan isi sheet Referensi Kode dengan data live
        $spreadsheet = IOFactory::load($templatePath);

        // ── Sheet: Referensi Kode ──
        $refSheet = $spreadsheet->getSheetByName('Referensi Kode');
        if ($refSheet) {
            $this->fillReferenceSheet($refSheet, $variants, $intensities, $ingredients);
        }

        // ── Tambahkan timestamp di header template ──
        $dataSheet = $spreadsheet->getSheetByName('Import Data');
        if ($dataSheet) {
            $dataSheet->getCell('A2')->setValue(
                'Isi data sesuai kolom. WAJIB: variant_code, intensity_code, ingredient_code, base_quantity. '
                . 'Template dibuat: ' . now()->format('d/m/Y H:i') . ' WIB. Hapus baris contoh sebelum import.'
            );
        }

        // Simpan ke temp file
        $filename = 'template_import_formula_variant_' . now()->format('Ymd_His') . '.xlsx';
        $tmpPath  = storage_path("app/tmp/{$filename}");
        if (!is_dir(storage_path('app/tmp'))) mkdir(storage_path('app/tmp'), 0755, true);

        $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save($tmpPath);

        return response()->download($tmpPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    private function fillReferenceSheet($sheet, $variants, $intensities, $ingredients): void
    {
        // Style helpers
        $headerStyle = [
            'font' => ['bold' => true, 'size' => 9, 'color' => ['rgb' => '1E293B']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'EEF2FF']],
        ];
        $dataStyle = [
            'font'      => ['size' => 9],
            'alignment' => ['vertical' => 'center'],
        ];

        $row = 2;

        // ── Variant section ──
        $sheet->setCellValue("A{$row}", 'KODE VARIANT');
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->getStyle("A{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '7C3AED']],
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

        // ── Intensity section ──
        $sheet->setCellValue("A{$row}", 'KODE INTENSITAS');
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->getStyle("A{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '0369A1']],
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

        // ── Ingredient section ──
        $sheet->setCellValue("A{$row}", 'KODE BAHAN BAKU');
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->getStyle("A{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '065F46']],
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

    // -------------------------------------------------------------------------
    // Validate Import (preview sebelum simpan)
    // -------------------------------------------------------------------------

    /**
     * Baca file xlsx, validasi setiap baris, kembalikan preview JSON.
     * Belum menyimpan ke database.
     */
    public function validate(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:5120',
        ]);

        $rows   = $this->parseExcel($request->file('file'));
        $result = $this->validateRows($rows);

        return response()->json($result);
    }

    // -------------------------------------------------------------------------
    // Import (simpan ke database)
    // -------------------------------------------------------------------------

    /**
     * Import dari file xlsx ke database.
     * Baris error di-skip, baris valid disimpan.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file'           => 'required|file|mimes:xlsx,xls|max:5120',
            'overwrite'      => 'boolean',  // true = timpa recipe yang sudah ada
            'skip_errors'    => 'boolean',  // true = skip baris error, false = abort semua jika ada error
        ]);

        $overwrite   = $request->boolean('overwrite', true);
        $skipErrors  = $request->boolean('skip_errors', true);

        $rows    = $this->parseExcel($request->file('file'));
        $result  = $this->validateRows($rows);

        // Jika ada error dan mode tidak skip → tolak semua
        if (!$skipErrors && count($result['errors']) > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Import dibatalkan: ditemukan ' . count($result['errors']) . ' baris error. Perbaiki terlebih dahulu.',
                'errors'  => $result['errors'],
                'summary' => $result['summary'],
            ], 422);
        }

        $imported = 0;
        $skipped  = 0;
        $overwritten = 0;

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

    // -------------------------------------------------------------------------
    // Private: parseExcel
    // -------------------------------------------------------------------------

    /**
     * Baca sheet "Import Data" dari baris 4 ke bawah.
     * Kolom: A=variant_code, B=intensity_code, C=ingredient_code,
     *        D=base_quantity, E=unit, F=notes
     */
    private function parseExcel($file): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet       = $spreadsheet->getSheetByName('Import Data');

        if (!$sheet) {
            // Coba sheet pertama jika sheet "Import Data" tidak ditemukan
            $sheet = $spreadsheet->getActiveSheet();
        }

        $rows      = [];
        $maxRow    = $sheet->getHighestDataRow();
        $startRow  = 4; // Baris 1-2: title, baris 3: header, baris 4+: data

        for ($r = $startRow; $r <= $maxRow; $r++) {
            $variantCode    = trim((string) $sheet->getCell("A{$r}")->getValue());
            $intensityCode  = trim((string) $sheet->getCell("B{$r}")->getValue());
            $ingredientCode = trim((string) $sheet->getCell("C{$r}")->getValue());
            $baseQuantity   = $sheet->getCell("D{$r}")->getValue();
            $unit           = trim((string) ($sheet->getCell("E{$r}")->getValue() ?? 'ml')) ?: 'ml';
            $notes          = trim((string) ($sheet->getCell("F{$r}")->getValue() ?? ''));

            // Skip baris kosong
            if (empty($variantCode) && empty($intensityCode) && empty($ingredientCode)) {
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

    // -------------------------------------------------------------------------
    // Private: validateRows
    // -------------------------------------------------------------------------

    private function validateRows(array $rows): array
    {
        // Cache semua kode yang valid
        $variants    = Variant::where('is_active', true)->pluck('id', 'code');
        $intensities = Intensity::where('is_active', true)->pluck('id', 'code');
        $ingredients = Ingredient::where('is_active', true)->pluck('id', 'code');

        $validRows  = [];
        $errorRows  = [];

        // Untuk validasi total per kombinasi
        $groupQty = []; // key: variant_code|intensity_code → total_qty

        foreach ($rows as $row) {
            $rowErrors = [];

            // Validasi variant_code
            if (empty($row['variant_code'])) {
                $rowErrors[] = 'variant_code wajib diisi';
            } elseif (!$variants->has($row['variant_code'])) {
                $rowErrors[] = "variant_code '{$row['variant_code']}' tidak ditemukan di database";
            }

            // Validasi intensity_code
            if (empty($row['intensity_code'])) {
                $rowErrors[] = 'intensity_code wajib diisi';
            } elseif (!$intensities->has($row['intensity_code'])) {
                $rowErrors[] = "intensity_code '{$row['intensity_code']}' tidak ditemukan di database";
            }

            // Validasi ingredient_code
            if (empty($row['ingredient_code'])) {
                $rowErrors[] = 'ingredient_code wajib diisi';
            } elseif (!$ingredients->has($row['ingredient_code'])) {
                $rowErrors[] = "ingredient_code '{$row['ingredient_code']}' tidak ditemukan di database";
            }

            // Validasi base_quantity
            $qty = is_numeric($row['base_quantity']) ? (float) $row['base_quantity'] : null;
            if ($qty === null) {
                $rowErrors[] = 'base_quantity harus angka';
            } elseif ($qty <= 0) {
                $rowErrors[] = 'base_quantity harus > 0';
            }

            if (count($rowErrors) > 0) {
                $errorRows[] = [
                    'row'    => $row['row'],
                    'data'   => $row,
                    'errors' => $rowErrors,
                ];
                continue;
            }

            // Enrich dengan ID
            $groupKey = $row['variant_code'] . '|' . $row['intensity_code'];
            $groupQty[$groupKey] = ($groupQty[$groupKey] ?? 0) + $qty;

            $validRows[] = array_merge($row, [
                'variant_id'    => $variants->get($row['variant_code']),
                'intensity_id'  => $intensities->get($row['intensity_code']),
                'ingredient_id' => $ingredients->get($row['ingredient_code']),
                'base_quantity' => $qty,
            ]);
        }

        // Validasi total per kombinasi harus = 30ml (warning, bukan error keras)
        $volumeWarnings = [];
        foreach ($groupQty as $key => $total) {
            if (abs($total - 30) > 0.5) {
                [$vc, $ic] = explode('|', $key);
                $volumeWarnings[] = "Kombinasi {$vc} + {$ic}: total base_quantity = {$total}ml (seharusnya 30ml)";
            }
        }

        // Summary per kombinasi
        $summary = [];
        foreach (collect($validRows)->groupBy(fn($r) => $r['variant_code'] . ' + ' . $r['intensity_code']) as $combo => $items) {
            $total = $items->sum('base_quantity');
            $summary[] = [
                'combination'  => $combo,
                'ingredient_count' => $items->count(),
                'total_volume' => round($total, 2),
                'is_valid_volume' => abs($total - 30) <= 0.5,
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
}
