<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\Intensity;
use App\Models\IntensitySizePrice;
use App\Models\Size;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\Controller;
use App\Http\Requests\IntensitySizePrice\StoreIntensitySizePriceRequest;
use App\Http\Requests\IntensitySizePrice\UpdateIntensitySizePriceRequest;

class IntensitySizePriceController extends Controller
{
    // -------------------------------------------------------------------------
    // Shared data helpers
    // -------------------------------------------------------------------------

    private function getIntensities()
    {
        return Intensity::select('id', 'name', 'code')
            ->where('is_active', true)
            ->ordered()
            ->get();
    }

    private function getSizes()
    {
        return Size::select('id', 'name', 'volume_ml')
            ->where('is_active', true)
            ->ordered()
            ->get();
    }

    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    public function index(Request $request): Response
    {
        $prices = IntensitySizePrice::query()
            ->with([
                'intensity:id,name,code',
                'size:id,name,volume_ml',
            ])
            ->select(['id', 'intensity_id', 'size_id', 'price', 'is_active', 'notes', 'created_at'])
            ->when($request->filled('search'),       fn ($q) => $q->search($request->search))
            ->when($request->filled('intensity_id'), fn ($q) => $q->where('intensity_id', $request->intensity_id))
            ->when($request->filled('size_id'),      fn ($q) => $q->where('size_id', $request->size_id))
            ->when(
                $request->has('is_active') && $request->is_active !== '',
                fn ($q) => $q->where('is_active', $request->boolean('is_active'))
            )
            ->ordered()
            ->paginate($request->input('per_page', 20))
            ->withQueryString()
            ->through(fn ($isp) => [
                'id'        => $isp->id,
                'intensity' => $isp->intensity
                    ? ['id' => $isp->intensity->id, 'name' => $isp->intensity->name, 'code' => $isp->intensity->code]
                    : null,
                'size'      => $isp->size
                    ? ['id' => $isp->size->id, 'name' => $isp->size->name, 'volume_ml' => $isp->size->volume_ml]
                    : null,
                'price'          => (float) $isp->price,
                'price_formatted' => $isp->price_formatted,
                'is_active'      => $isp->is_active,
                'notes'          => $isp->notes,
                'created_at'     => $isp->created_at->format('d M Y'),
            ]);

        return Inertia::render('Dashboard/IntensitySizePrices/Index', [
            'intensitySizePrices' => $prices,
            'intensities'         => $this->getIntensities(),
            'sizes'               => $this->getSizes(),
            'filters'             => [
                'search'       => $request->search,
                'intensity_id' => $request->intensity_id,
                'size_id'      => $request->size_id,
                'is_active'    => $request->is_active,
                'per_page'     => $request->input('per_page', 20),
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    public function create(): Response
    {
        return Inertia::render('Dashboard/IntensitySizePrices/Create', [
            'intensities' => $this->getIntensities(),
            'sizes'       => $this->getSizes(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Store
    // -------------------------------------------------------------------------

    public function store(StoreIntensitySizePriceRequest $request): RedirectResponse
    {
        try {
            DB::beginTransaction();
            IntensitySizePrice::create($request->validated());
            DB::commit();

            return redirect()
                ->route('intensity-size-prices.index')
                ->with('success', 'Harga berhasil ditambahkan! ✅');

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

    public function edit(IntensitySizePrice $intensitySizePrice): Response
    {
        return Inertia::render('Dashboard/IntensitySizePrices/Edit', [
            'intensitySizePrice' => [
                'id'           => $intensitySizePrice->id,
                'intensity_id' => $intensitySizePrice->intensity_id,
                'size_id'      => $intensitySizePrice->size_id,
                'price'        => (float) $intensitySizePrice->price,
                'is_active'    => $intensitySizePrice->is_active,
                'notes'        => $intensitySizePrice->notes ?? '',
            ],
            'intensities' => $this->getIntensities(),
            'sizes'       => $this->getSizes(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function update(UpdateIntensitySizePriceRequest $request, IntensitySizePrice $intensitySizePrice): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $intensitySizePrice->update($request->validated());
            DB::commit();

            return redirect()
                ->route('intensity-size-prices.index')
                ->with('success', 'Harga berhasil diperbarui! 🚀');

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

    public function destroy(IntensitySizePrice $intensitySizePrice): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $intensitySizePrice->delete();
            DB::commit();

            return redirect()
                ->route('intensity-size-prices.index')
                ->with('success', 'Harga berhasil dihapus! 🗑️');

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
            'ids.*' => 'exists:intensity_size_prices,id',
        ], [
            'ids.required' => 'Pilih minimal 1 harga untuk dihapus.',
            'ids.min'      => 'Pilih minimal 1 harga untuk dihapus.',
            'ids.*.exists' => 'Salah satu harga tidak ditemukan.',
        ]);

        if ($validator->fails()) {
            return back()->with('error', $validator->errors()->first());
        }

        try {
            DB::beginTransaction();

            $count = IntensitySizePrice::whereIn('id', $request->ids)->count();
            IntensitySizePrice::whereIn('id', $request->ids)->delete();

            DB::commit();

            return redirect()
                ->route('intensity-size-prices.index')
                ->with('success', "{$count} harga berhasil dihapus!");

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }
}
