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
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('code', 'like', '%' . $request->search . '%');
            })
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
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
        try {
            DB::beginTransaction();

            $discount = DiscountType::create($request->safe()->except([
                'store_ids', 'applicabilities', 'requirements', 'rewards',
            ]));

            $this->syncStores($discount, $request->store_ids ?? []);
            $this->syncApplicabilities($discount, $request->applicabilities ?? []);
            $this->syncRequirements($discount, $request->requirements ?? []);
            $this->syncRewardsWithPools($discount, $request->rewards ?? []);

            DB::commit();

            return redirect()->route('discounts.index')->with('success', 'Promo berhasil dibuat!');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Gagal menyimpan: ' . $e->getMessage());
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
        try {
            DB::beginTransaction();

            $discount->update($request->safe()->except([
                'store_ids', 'applicabilities', 'requirements', 'rewards',
            ]));

            $this->syncStores($discount, $request->store_ids ?? []);

            $discount->applicabilities()->delete();
            $this->syncApplicabilities($discount, $request->applicabilities ?? []);

            $discount->requirements()->delete();
            $this->syncRequirements($discount, $request->requirements ?? []);

            // Delete pools first (no cascade via Laravel automatically)
            foreach ($discount->rewards as $reward) {
                $reward->pools()->delete();
            }
            $discount->rewards()->delete();
            $this->syncRewardsWithPools($discount, $request->rewards ?? []);

            DB::commit();

            return redirect()->route('discounts.index')->with('success', 'Promo diperbarui!');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Gagal update: ' . $e->getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Destroy
    // -------------------------------------------------------------------------

    public function destroy(DiscountType $discount)
    {
        $discount->delete();

        return back()->with('success', 'Promo dihapus!');
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    /**
     * Master data required by Create & Edit forms.
     * Variant = perfume name, Intensity = EDT/EDP/EXT, Size = ml size
     */
    private function formData(): array
    {
        return [
            'stores'      => Store::select('id', 'name')->where('is_active', true)->orderBy('name')->get(),
            'variants'    => Variant::select('id', 'name')->where('is_active', true)->orderBy('sort_order')->get(),
            'intensities' => Intensity::select('id', 'name', 'code')->where('is_active', true)->orderBy('sort_order')->get(),
            'sizes'       => Size::select('id', 'name', 'volume_ml')->where('is_active', true)->orderBy('sort_order')->get(),
        ];
    }

    /** Sync store assignments */
    private function syncStores(DiscountType $discount, array $storeIds): void
    {
        $discount->stores()->delete();

        if (empty($storeIds)) {
            return;
        }

        $rows = array_map(fn ($id) => [
            'discount_type_id' => $discount->id,
            'store_id'         => $id,
            'created_at'       => now(),
            'updated_at'       => now(),
        ], $storeIds);

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
     * Pools are only created when reward.is_pool = true.
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
                'customer_can_choose' => $rewardData['customer_can_choose'] ?? false,
                'is_pool'             => $rewardData['is_pool'] ?? false,
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
                        'is_active'    => $poolItem['is_active'] ?? true,
                        'sort_order'   => $poolItem['sort_order'] ?? $index,
                    ]);
                }
            }
        }
    }
}
