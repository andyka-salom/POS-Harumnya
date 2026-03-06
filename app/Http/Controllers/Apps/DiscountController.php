<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\DiscountType;
use App\Models\Store;
use App\Models\Variant;
use App\Models\Intensity;
use App\Models\Size;
use App\Http\Requests\Discount\StoreDiscountRequest;
use App\Http\Requests\Discount\UpdateDiscountRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DiscountController extends Controller
{
    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    public function index(Request $request)
    {
        $discounts = DiscountType::query()
            ->with(['stores.store:id,name', 'rewards'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($inner) use ($request) {
                    $inner->where('name', 'like', '%' . $request->search . '%')
                          ->orWhere('code', 'like', '%' . $request->search . '%');
                });
            })
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when(
                $request->filled('is_active'),
                fn ($q) => $q->where('is_active', $request->boolean('is_active'))
            )
            ->orderByDesc('priority')
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Dashboard/Discounts/Index', [
            'discounts' => $discounts,
            'filters'   => $request->only(['search', 'type', 'is_active']),
        ]);
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    public function create()
    {
        return Inertia::render('Dashboard/Discounts/Create', $this->formData());
    }

    // -------------------------------------------------------------------------
    // Store
    // -------------------------------------------------------------------------

    public function store(StoreDiscountRequest $request)
    {
        DB::beginTransaction();

        try {
            $discount = DiscountType::create(
                $request->safe()->except(['store_ids', 'applicabilities', 'requirements', 'rewards'])
            );

            $this->syncStores($discount, $request->store_ids ?? []);
            $this->syncApplicabilities($discount, $request->applicabilities ?? []);
            $this->syncRequirements($discount, $request->requirements ?? []);
            $this->syncRewardsWithPools($discount, $request->rewards ?? []);

            DB::commit();

            return redirect()
                ->route('discounts.index')
                ->with('success', 'Promo berhasil dibuat!');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->withInput()
                ->with('error', 'Gagal menyimpan promo: ' . $e->getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Edit
    // -------------------------------------------------------------------------

    public function edit(DiscountType $discount)
    {
        $discount->load([
            'stores.store:id,name',
            'applicabilities.variant:id,name',
            'applicabilities.intensity:id,name,code',
            'applicabilities.size:id,name,volume_ml',
            'requirements.variant:id,name',
            'requirements.intensity:id,name,code',
            'requirements.size:id,name,volume_ml',
            'rewards.variant:id,name',
            'rewards.intensity:id,name,code',
            'rewards.size:id,name,volume_ml',
            'rewards.pools',
        ]);

        return Inertia::render('Dashboard/Discounts/Edit', [
            'discount' => $discount,
            ...$this->formData(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function update(UpdateDiscountRequest $request, DiscountType $discount)
    {
        DB::beginTransaction();

        try {
            $discount->update(
                $request->safe()->except(['store_ids', 'applicabilities', 'requirements', 'rewards'])
            );

            // FIX: syncStores menggunakan metode yang sama — delete lalu re-insert
            $this->syncStores($discount, $request->store_ids ?? []);

            $discount->applicabilities()->delete();
            $this->syncApplicabilities($discount, $request->applicabilities ?? []);

            $discount->requirements()->delete();
            $this->syncRequirements($discount, $request->requirements ?? []);

            // Hapus pools terlebih dahulu (tidak ada cascadeOnDelete otomatis via Eloquent di sini)
            foreach ($discount->rewards()->with('pools')->get() as $reward) {
                $reward->pools()->delete();
            }
            $discount->rewards()->delete();
            $this->syncRewardsWithPools($discount, $request->rewards ?? []);

            DB::commit();

            return redirect()
                ->route('discounts.index')
                ->with('success', 'Promo berhasil diperbarui!');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()
                ->withInput()
                ->with('error', 'Gagal memperbarui promo: ' . $e->getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Destroy
    // -------------------------------------------------------------------------

    public function destroy(DiscountType $discount)
    {
        DB::beginTransaction();

        try {
            // Hapus relasi nested sebelum soft-delete
            foreach ($discount->rewards()->with('pools')->get() as $reward) {
                $reward->pools()->delete();
            }
            $discount->rewards()->delete();
            $discount->requirements()->delete();
            $discount->applicabilities()->delete();

            // FIX: delete store pivot rows (tabel discount_stores tidak soft-delete)
            $discount->stores()->delete();

            $discount->delete(); // soft delete

            DB::commit();

            return back()->with('success', 'Promo berhasil dihapus!');

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()->with('error', 'Gagal menghapus promo: ' . $e->getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    /**
     * Master data untuk form Create & Edit.
     * Variant = nama parfum, Intensity = EDT/EDP/EXT, Size = ukuran ml
     */
    private function formData(): array
    {
        return [
            'stores'      => Store::select('id', 'name')
                                ->where('is_active', true)
                                ->orderBy('name')
                                ->get(),
            'variants'    => Variant::select('id', 'name')
                                ->where('is_active', true)
                                ->orderBy('sort_order')
                                ->get(),
            'intensities' => Intensity::select('id', 'name', 'code')
                                ->where('is_active', true)
                                ->orderBy('sort_order')
                                ->get(),
            'sizes'       => Size::select('id', 'name', 'volume_ml')
                                ->where('is_active', true)
                                ->orderBy('sort_order')
                                ->get(),
        ];
    }

    /**
     * Sync store assignments.
     * FIX: gunakan upsert-safe pattern — delete then re-insert
     * agar tidak bentrok dengan unique constraint (discount_type_id, store_id).
     */
    private function syncStores(DiscountType $discount, array $storeIds): void
    {
        // Hapus semua baris lama untuk discount ini
        DB::table('discount_stores')
            ->where('discount_type_id', $discount->id)
            ->delete();

        if (empty($storeIds)) {
            return;
        }

        // De-duplicate untuk menghindari insert duplikat
        $uniqueStoreIds = array_values(array_unique($storeIds));

        $rows = array_map(fn ($id) => [
            'id'               => (string) \Illuminate\Support\Str::uuid(),
            'discount_type_id' => $discount->id,
            'store_id'         => $id,
            'created_at'       => now(),
            'updated_at'       => now(),
        ], $uniqueStoreIds);

        DB::table('discount_stores')->insert($rows);
    }

    /** Sync applicabilities */
    private function syncApplicabilities(DiscountType $discount, array $items): void
    {
        foreach ($items as $item) {
            $discount->applicabilities()->create([
                'variant_id'   => $item['variant_id'] ?? null,
                'intensity_id' => $item['intensity_id'] ?? null,
                'size_id'      => $item['size_id'] ?? null,
            ]);
        }
    }

    /** Sync requirements */
    private function syncRequirements(DiscountType $discount, array $items): void
    {
        foreach ($items as $item) {
            $discount->requirements()->create([
                'variant_id'        => $item['variant_id'] ?? null,
                'intensity_id'      => $item['intensity_id'] ?? null,
                'size_id'           => $item['size_id'] ?? null,
                'required_quantity' => $item['required_quantity'] ?? 1,
                'matching_mode'     => $item['matching_mode'] ?? 'all',
                'group_key'         => $item['group_key'] ?? null,
            ]);
        }
    }

    /**
     * Sync rewards + nested pool items.
     * Pool hanya dibuat jika reward.is_pool = true.
     */
    private function syncRewardsWithPools(DiscountType $discount, array $rewards): void
    {
        foreach ($rewards as $rewardData) {
            $pools = $rewardData['pools'] ?? [];

            $reward = $discount->rewards()->create([
                'variant_id'          => $rewardData['variant_id'] ?? null,
                'intensity_id'        => $rewardData['intensity_id'] ?? null,
                'size_id'             => $rewardData['size_id'] ?? null,
                'reward_quantity'     => $rewardData['reward_quantity'] ?? 1,
                'customer_can_choose' => (bool) ($rewardData['customer_can_choose'] ?? false),
                'is_pool'             => (bool) ($rewardData['is_pool'] ?? false),
                'max_choices'         => $rewardData['max_choices'] ?? null,
                'discount_percentage' => $rewardData['discount_percentage'] ?? null,
                'fixed_price'         => $rewardData['fixed_price'] ?? null,
                'priority'            => $rewardData['priority'] ?? 0,
            ]);

            if (! empty($rewardData['is_pool']) && ! empty($pools)) {
                foreach ($pools as $index => $poolItem) {
                    $reward->pools()->create([
                        'product_id'   => $poolItem['product_id'] ?? null,
                        'variant_id'   => $poolItem['variant_id'] ?? null,
                        'intensity_id' => $poolItem['intensity_id'] ?? null,
                        'size_id'      => $poolItem['size_id'] ?? null,
                        'label'        => $poolItem['label'],
                        'image_url'    => $poolItem['image_url'] ?? null,
                        'fixed_price'  => $poolItem['fixed_price'] ?? 0,
                        'probability'  => $poolItem['probability'] ?? null,
                        'is_active'    => (bool) ($poolItem['is_active'] ?? true),
                        'sort_order'   => $poolItem['sort_order'] ?? $index,
                    ]);
                }
            }
        }
    }
}
