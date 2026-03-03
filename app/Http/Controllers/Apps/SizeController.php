<?php

namespace App\Http\Controllers\Apps;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\Size;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Size\StoreSizeRequest;
use App\Http\Requests\Size\UpdateSizeRequest;

class SizeController extends Controller
{
    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    public function index(Request $request): Response
    {
        $sizes = Size::query()
            ->select(['id', 'volume_ml', 'name', 'sort_order', 'is_active', 'created_at'])
            ->when($request->filled('search'), fn ($q) => $q->search($request->search))
            ->when(
                $request->has('is_active') && $request->is_active !== '',
                fn ($q) => $q->where('is_active', $request->boolean('is_active'))
            )
            ->ordered()
            ->paginate($request->input('per_page', 20))
            ->withQueryString()
            ->through(fn ($size) => [
                'id'         => $size->id,
                'volume_ml'  => $size->volume_ml,
                'name'       => $size->name,
                'sort_order' => $size->sort_order,
                'is_active'  => $size->is_active,
                'created_at' => $size->created_at->format('d M Y'),
            ]);

        return Inertia::render('Dashboard/Sizes/Index', [
            'sizes'   => $sizes,
            'filters' => [
                'search'   => $request->search,
                'is_active' => $request->is_active,
                'per_page' => $request->input('per_page', 20),
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    public function create(): Response
    {
        return Inertia::render('Dashboard/Sizes/Create');
    }

    // -------------------------------------------------------------------------
    // Store
    // -------------------------------------------------------------------------

    public function store(StoreSizeRequest $request): RedirectResponse
    {
        try {
            DB::beginTransaction();
            Size::create($request->validated());
            DB::commit();

            return redirect()
                ->route('sizes.index')
                ->with('success', 'Ukuran berhasil ditambahkan! ✅');

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

    public function edit(Size $size): Response
    {
        return Inertia::render('Dashboard/Sizes/Edit', [
            'size' => [
                'id'         => $size->id,
                'volume_ml'  => $size->volume_ml,
                'name'       => $size->name,
                'sort_order' => $size->sort_order,
                'is_active'  => $size->is_active,
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function update(UpdateSizeRequest $request, Size $size): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $size->update($request->validated());
            DB::commit();

            return redirect()
                ->route('sizes.index')
                ->with('success', 'Ukuran berhasil diperbarui! 🚀');

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

    public function destroy(Size $size): RedirectResponse
    {
        try {
            DB::beginTransaction();
            $size->delete();
            DB::commit();

            return redirect()
                ->route('sizes.index')
                ->with('success', 'Ukuran berhasil dihapus! 🗑️');

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
            'ids.*' => 'exists:sizes,id',
        ], [
            'ids.required' => 'Pilih minimal 1 ukuran untuk dihapus.',
            'ids.min'      => 'Pilih minimal 1 ukuran untuk dihapus.',
            'ids.*.exists' => 'Salah satu ukuran tidak ditemukan.',
        ]);

        if ($validator->fails()) {
            return back()->with('error', $validator->errors()->first());
        }

        try {
            DB::beginTransaction();

            // Single query — lebih efisien dari foreach delete
            $count = Size::whereIn('id', $request->ids)->count();
            Size::whereIn('id', $request->ids)->delete();

            DB::commit();

            return redirect()
                ->route('sizes.index')
                ->with('success', "{$count} ukuran berhasil dihapus!");

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->with('error', 'Terjadi kesalahan sistem. Silakan coba lagi.');
        }
    }
}
