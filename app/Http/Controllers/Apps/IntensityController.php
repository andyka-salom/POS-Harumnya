<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\Intensity;
use App\Models\Size;
use App\Models\IntensitySizeQuantity;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Validator;

class IntensityController extends Controller
{
    // =========================================================================
    // INDEX
    // =========================================================================

    public function index(Request $request): Response
    {
        $intensities = Intensity::query()
            ->select(['id', 'code', 'name', 'oil_ratio', 'alcohol_ratio', 'sort_order', 'is_active', 'created_at'])
            ->when($request->filled('search'), fn ($q) => $q->search($request->search))
            ->when(
                $request->has('is_active') && $request->is_active !== '',
                fn ($q) => $q->where('is_active', $request->boolean('is_active'))
            )
            ->ordered()
            ->paginate($request->input('per_page', 12))
            ->withQueryString()
            ->through(fn (Intensity $intensity) => [
                'id'              => $intensity->id,
                'code'            => $intensity->code,
                'name'            => $intensity->name,
                'oil_ratio'       => $intensity->oil_ratio,
                'alcohol_ratio'   => $intensity->alcohol_ratio,
                'ratio_display'   => $intensity->oil_ratio . ' : ' . $intensity->alcohol_ratio,
                'sort_order'      => $intensity->sort_order,
                'is_active'       => $intensity->is_active,
                'status_label'    => $intensity->status_label,
                'created_at'      => $intensity->created_at->format('d M Y'),
                'size_quantities' => $intensity->sizeQuantities()
                    ->with('size:id,name,volume_ml')
                    ->get()
                    ->map(fn ($q) => [
                        'size_name'        => $q->size->name,
                        'volume_ml'        => $q->size->volume_ml,
                        'oil_quantity'     => $q->oil_quantity,
                        'alcohol_quantity' => $q->alcohol_quantity,
                        'total_volume'     => $q->total_volume,
                    ]),
            ]);

        return Inertia::render('Dashboard/Intensities/Index', [
            'intensities' => $intensities,
            'filters'     => [
                'search'    => $request->search,
                'is_active' => $request->is_active,
                'per_page'  => $request->input('per_page', 12),
            ],
        ]);
    }

    // =========================================================================
    // CREATE
    // =========================================================================

    public function create(): Response
    {
        return Inertia::render('Dashboard/Intensities/Create', [
            'sizes' => $this->getActiveSizes(),
        ]);
    }

    // =========================================================================
    // STORE
    // =========================================================================

    public function store(Request $request): RedirectResponse
    {
        $validated   = $this->validateIntensity($request);
        $sizeQtyData = $this->validateAndFilterSizeQty($request);

        try {
            DB::beginTransaction();

            $intensity = Intensity::create($validated);

            if (!empty($sizeQtyData)) {
                $this->saveSizeQuantities($intensity->id, $sizeQtyData);
            }

            DB::commit();

            return redirect()
                ->route('intensities.index')
                ->with('success', 'Level Intensitas berhasil ditambahkan! 🔥');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()->withInput()->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // =========================================================================
    // SHOW → redirect ke edit
    // =========================================================================

    public function show(Intensity $intensity): RedirectResponse
    {
        return redirect()->route('intensities.edit', $intensity);
    }

    // =========================================================================
    // EDIT
    // =========================================================================

    public function edit(Intensity $intensity): Response
    {
        $sizes = $this->getActiveSizes();

        $existingQty = IntensitySizeQuantity::where('intensity_id', $intensity->id)
            ->get()
            ->keyBy('size_id');

        $sizeQuantities = $sizes->map(fn ($size) => [
            'size_id'          => $size->id,
            'size_name'        => $size->name,
            'volume_ml'        => $size->volume_ml,
            'oil_quantity'     => $existingQty->get($size->id)?->oil_quantity     ?? 0,
            'alcohol_quantity' => $existingQty->get($size->id)?->alcohol_quantity ?? 0,
            'total_volume'     => $existingQty->get($size->id)?->total_volume     ?? $size->volume_ml,
        ]);

        return Inertia::render('Dashboard/Intensities/Edit', [
            'intensity' => [
                'id'            => $intensity->id,
                'code'          => $intensity->code,
                'name'          => $intensity->name,
                'oil_ratio'     => $intensity->oil_ratio,
                'alcohol_ratio' => $intensity->alcohol_ratio,
                'sort_order'    => $intensity->sort_order,
                'is_active'     => $intensity->is_active,
            ],
            'sizes'           => $sizes,
            'size_quantities' => $sizeQuantities,
        ]);
    }

    // =========================================================================
    // UPDATE
    // =========================================================================

    public function update(Request $request, Intensity $intensity): RedirectResponse
    {
        $validated   = $this->validateIntensity($request, $intensity->id);
        $sizeQtyData = $this->validateAndFilterSizeQty($request);

        try {
            DB::beginTransaction();

            $intensity->update($validated);

            // Selalu sync: hapus lama, insert baru
            $this->saveSizeQuantities($intensity->id, $sizeQtyData);

            DB::commit();

            return redirect()
                ->route('intensities.index')
                ->with('success', 'Intensitas berhasil diperbarui! 🚀');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()->withInput()->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // =========================================================================
    // DESTROY
    // =========================================================================

    public function destroy(Intensity $intensity): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $intensity->delete(); // cascade akan hapus IntensitySizeQuantity
            DB::commit();

            return redirect()
                ->route('intensities.index')
                ->with('success', 'Intensitas berhasil dihapus! 🗑️');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // =========================================================================
    // BULK DELETE
    // =========================================================================

    public function bulkDelete(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'ids'   => 'required|array|min:1',
            'ids.*' => 'exists:intensities,id',
        ], [
            'ids.required' => 'Pilih minimal 1 intensitas untuk dihapus.',
            'ids.min'      => 'Pilih minimal 1 intensitas untuk dihapus.',
            'ids.*.exists' => 'Salah satu intensitas tidak ditemukan.',
        ]);

        if ($validator->fails()) {
            return back()->with('error', $validator->errors()->first());
        }

        try {
            DB::beginTransaction();

            $count = Intensity::whereIn('id', $request->ids)->count();
            Intensity::whereIn('id', $request->ids)->delete();

            DB::commit();

            return redirect()
                ->route('intensities.index')
                ->with('success', "{$count} intensitas berhasil dihapus!");

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Ambil semua size aktif, diurutkan berdasarkan volume.
     */
    private function getActiveSizes()
    {
        return Size::where('is_active', true)
            ->orderBy('volume_ml')
            ->get(['id', 'name', 'volume_ml']);
    }

    /**
     * Validasi field utama Intensity.
     */
    private function validateIntensity(Request $request, ?string $ignoreId = null): array
    {
        return $request->validate([
            'code'          => 'required|string|max:20|unique:intensities,code' . ($ignoreId ? ",{$ignoreId}" : ''),
            'name'          => 'required|string|max:100',
            'oil_ratio'     => 'required|string|max:10',
            'alcohol_ratio' => 'required|string|max:10',
            'sort_order'    => 'required|integer|min:0',
            'is_active'     => 'boolean',
        ]);
    }

    /**
     * Validasi size_quantities dari request.
     * Hanya mengambil field DB yang diperlukan.
     * Baris dengan oil=0 DAN alcohol=0 di-skip (belum diisi).
     */
    private function validateAndFilterSizeQty(Request $request): array
    {
        if (!$request->filled('size_quantities')) return [];

        $validator = Validator::make($request->all(), [
            'size_quantities'                    => 'array',
            'size_quantities.*.size_id'          => 'required|exists:sizes,id',
            'size_quantities.*.oil_quantity'     => 'required|integer|min:0',
            'size_quantities.*.alcohol_quantity' => 'required|integer|min:0',
            'size_quantities.*.total_volume'     => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            abort(422, $validator->errors()->first());
        }

        $result = [];

        foreach ($request->size_quantities as $qty) {
            $oil     = (int) $qty['oil_quantity'];
            $alcohol = (int) $qty['alcohol_quantity'];
            $total   = (int) $qty['total_volume'];

            // Skip baris yang belum diisi
            if ($oil === 0 && $alcohol === 0) continue;

            // oil + alcohol harus = total_volume
            if (($oil + $alcohol) !== $total) {
                abort(422, "Ukuran {$total}ml: bibit ({$oil}) + alkohol ({$alcohol}) = " . ($oil + $alcohol) . ", harus = {$total}");
            }

            $result[] = [
                'size_id'          => $qty['size_id'],
                'oil_quantity'     => $oil,
                'alcohol_quantity' => $alcohol,
                'total_volume'     => $total,
            ];
        }

        return $result;
    }

    /**
     * Hapus semua qty lama untuk intensity ini, lalu bulk insert baru.
     *
     * FIX: Menggunakan IntensitySizeQuantity::bulkInsert() yang men-generate
     * UUID secara manual per-row agar tidak null saat bypass Eloquent events.
     * (Model::insert() tidak trigger HasUuids::creating() event)
     */
    private function saveSizeQuantities(string $intensityId, array $sizeQuantities): void
    {
        // Hapus semua data lama
        IntensitySizeQuantity::where('intensity_id', $intensityId)->delete();

        if (empty($sizeQuantities)) return;

        // Tambahkan intensity_id ke setiap baris
        $rows = array_map(fn (array $qty) => array_merge(
            $qty,
            ['intensity_id' => $intensityId]
        ), $sizeQuantities);

        // Bulk insert dengan UUID yang di-generate manual (production-safe)
        IntensitySizeQuantity::bulkInsert($rows);
    }
}
