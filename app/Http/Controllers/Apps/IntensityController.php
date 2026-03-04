<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use App\Models\Intensity;
use App\Models\Size;
use App\Models\IntensitySizeQuantity;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Validator;
use App\Http\Requests\Intensity\StoreIntensityRequest;
use App\Http\Requests\Intensity\UpdateIntensityRequest;
use Inertia\Response;

class IntensityController extends Controller
{
    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

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
            ->through(fn ($intensity) => [
                'id'                  => $intensity->id,
                'code'                => $intensity->code,
                'name'                => $intensity->name,
                'oil_ratio'           => $intensity->oil_ratio,       // string "1 : 2"
                'alcohol_ratio'       => $intensity->alcohol_ratio,   // string "2 : 1"
                'ratio_display'       => $intensity->ratio_display,
                'oil_percentage'      => $intensity->oil_percentage,  // float untuk bar chart
                'sort_order'          => $intensity->sort_order,
                'is_active'           => $intensity->is_active,
                'status_label'        => $intensity->status_label,
                'concentration_level' => $intensity->concentration_level,
                'created_at'          => $intensity->created_at->format('d M Y'),
                'size_quantities'     => $intensity->sizeQuantities()
                    ->with('size')
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

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    public function create(): Response
    {
        $sizes = Size::where('is_active', true)
            ->orderBy('volume_ml')
            ->get(['id', 'name', 'volume_ml']);

        return Inertia::render('Dashboard/Intensities/Create', [
            'sizes' => $sizes,
        ]);
    }

    // -------------------------------------------------------------------------
    // Store
    // -------------------------------------------------------------------------

    public function store(StoreIntensityRequest $request): RedirectResponse
    {
        $this->validateSizeQuantities($request);

        try {
            DB::beginTransaction();

            $intensity = Intensity::create($request->validated());

            if ($request->filled('size_quantities')) {
                $this->saveSizeQuantities($intensity->id, $request->size_quantities);
            }

            DB::commit();

            return redirect()
                ->route('intensities.index')
                ->with('success', 'Level Intensitas berhasil ditambahkan! 🔥');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->withInput()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // -------------------------------------------------------------------------
    // Edit
    // -------------------------------------------------------------------------

    public function edit(Intensity $intensity): Response
    {
        $sizes = Size::where('is_active', true)
            ->orderBy('volume_ml')
            ->get(['id', 'name', 'volume_ml']);

        $existingQty = IntensitySizeQuantity::where('intensity_id', $intensity->id)
            ->with('size')
            ->get()
            ->keyBy('size_id');

        $sizeQuantities = $sizes->map(function ($size) use ($existingQty) {
            $qty = $existingQty->get($size->id);
            return [
                'size_id'          => $size->id,
                'size_name'        => $size->name,
                'volume_ml'        => $size->volume_ml,
                'oil_quantity'     => $qty?->oil_quantity ?? 0,
                'alcohol_quantity' => $qty?->alcohol_quantity ?? 0,
                'total_volume'     => $qty?->total_volume ?? $size->volume_ml,
            ];
        });

        return Inertia::render('Dashboard/Intensities/Edit', [
            'intensity' => [
                'id'           => $intensity->id,
                'code'         => $intensity->code,
                'name'         => $intensity->name,
                'oil_ratio'    => $intensity->oil_ratio,     // string "1 : 2"
                'alcohol_ratio'=> $intensity->alcohol_ratio, // string "2 : 1"
                'sort_order'   => $intensity->sort_order,
                'is_active'    => $intensity->is_active,
            ],
            'sizes'           => $sizes,
            'size_quantities' => $sizeQuantities,
        ]);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function update(UpdateIntensityRequest $request, Intensity $intensity): RedirectResponse
    {
        $this->validateSizeQuantities($request);

        try {
            DB::beginTransaction();

            $intensity->update($request->validated());

            if ($request->filled('size_quantities')) {
                $this->saveSizeQuantities($intensity->id, $request->size_quantities);
            }

            DB::commit();

            return redirect()
                ->route('intensities.index')
                ->with('success', 'Intensitas berhasil diperbarui! 🚀');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->withInput()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // -------------------------------------------------------------------------
    // Destroy
    // -------------------------------------------------------------------------

    public function destroy(Intensity $intensity): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $intensity->delete();
            DB::commit();

            return redirect()
                ->route('intensities.index')
                ->with('success', 'Intensitas berhasil dihapus! 🗑️');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // -------------------------------------------------------------------------
    // Bulk Delete
    // -------------------------------------------------------------------------

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

            return back()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    private function validateSizeQuantities(Request $request): void
    {
        if (!$request->filled('size_quantities')) return;

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

        foreach ($request->size_quantities as $qty) {
            $sum = (int) $qty['oil_quantity'] + (int) $qty['alcohol_quantity'];
            if ($sum !== (int) $qty['total_volume']) {
                abort(422, "Ukuran {$qty['total_volume']}ml: oil ({$qty['oil_quantity']}) + alcohol ({$qty['alcohol_quantity']}) = {$sum}, harus = {$qty['total_volume']}");
            }
        }
    }

    private function saveSizeQuantities(string $intensityId, array $sizeQuantities): void
    {
        IntensitySizeQuantity::where('intensity_id', $intensityId)->delete();

        foreach ($sizeQuantities as $qty) {
            if ((int) $qty['oil_quantity'] === 0 && (int) $qty['alcohol_quantity'] === 0) {
                continue;
            }

            IntensitySizeQuantity::create([
                'intensity_id'     => $intensityId,
                'size_id'          => $qty['size_id'],
                'oil_quantity'     => (int) $qty['oil_quantity'],
                'alcohol_quantity' => (int) $qty['alcohol_quantity'],
                'total_volume'     => (int) $qty['total_volume'],
                'is_active'        => true,
            ]);
        }
    }
}
