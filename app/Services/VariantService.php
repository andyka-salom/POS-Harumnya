<?php

namespace App\Services;

use App\Models\Variant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class VariantService
{
    /**
     * Get paginated variants with filters
     *
     * @param array $filters
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getPaginatedVariants(array $filters)
    {
        $perPage = $filters['per_page'] ?? 20;

        return Variant::query()
            ->select(['id', 'code', 'name', 'image', 'gender', 'is_active', 'description', 'sort_order', 'created_at'])
            ->when(!empty($filters['search']), fn($q) => $q->search($filters['search']))
            ->when(!empty($filters['gender']), fn($q) => $q->gender($filters['gender']))
            ->when(isset($filters['is_active']) && $filters['is_active'] !== '', fn($q) => $q->active((bool)$filters['is_active']))
            ->ordered()
            ->latest('created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * Create a new variant
     *
     * @param array $data
     * @return Variant
     * @throws \Exception
     */
    public function createVariant(array $data): Variant
    {
        DB::beginTransaction();

        try {
            // Handle image upload
            if (isset($data['image']) && $data['image'] instanceof UploadedFile) {
                $data['image'] = $this->uploadImage($data['image']);
            }

            $variant = Variant::create($data);

            DB::commit();

            return $variant;
        } catch (\Exception $e) {
            DB::rollBack();

            // Clean up uploaded image if exists
            if (isset($data['image']) && is_string($data['image'])) {
                $this->deleteImage($data['image']);
            }

            throw $e;
        }
    }

    /**
     * Update an existing variant
     *
     * @param Variant $variant
     * @param array $data
     * @return Variant
     * @throws \Exception
     */
    public function updateVariant(Variant $variant, array $data): Variant
    {
        DB::beginTransaction();

        try {
            $oldImage = $variant->image;

            // Handle image upload
            if (isset($data['image']) && $data['image'] instanceof UploadedFile) {
                $data['image'] = $this->uploadImage($data['image']);

                // Delete old image after successful upload
                if ($oldImage) {
                    $this->deleteImage($oldImage);
                }
            } else {
                // Don't update image column if no new file
                unset($data['image']);
            }

            $variant->update($data);

            DB::commit();

            return $variant->fresh();
        } catch (\Exception $e) {
            DB::rollBack();

            // Clean up new uploaded image if exists
            if (isset($data['image']) && is_string($data['image']) && $data['image'] !== $oldImage) {
                $this->deleteImage($data['image']);
            }

            throw $e;
        }
    }

    /**
     * Delete a variant
     *
     * @param Variant $variant
     * @return bool
     * @throws \Exception
     */
    public function deleteVariant(Variant $variant): bool
    {
        DB::beginTransaction();

        try {
            // Delete image
            if ($variant->image) {
                $this->deleteImage($variant->image);
            }

            $variant->delete();

            DB::commit();

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Bulk delete variants
     *
     * @param array $ids
     * @return int
     * @throws \Exception
     */
    public function bulkDeleteVariants(array $ids): int
    {
        DB::beginTransaction();

        try {
            $variants = Variant::whereIn('id', $ids)->get();
            $count = 0;

            foreach ($variants as $variant) {
                if ($variant->image) {
                    $this->deleteImage($variant->image);
                }
                $variant->delete();
                $count++;
            }

            DB::commit();

            return $count;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Upload variant image
     *
     * @param UploadedFile $file
     * @return string
     */
    private function uploadImage(UploadedFile $file): string
    {
        $imageName = time() . '_' . $file->hashName();
        $file->storeAs('public/variants', $imageName);
        return $imageName;
    }

    /**
     * Delete variant image
     *
     * @param string $imageName
     * @return bool
     */
    private function deleteImage(string $imageName): bool
    {
        $path = 'variants/' . $imageName;

        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->delete($path);
        }

        return false;
    }

    /**
     * Transform variant for response
     *
     * @param Variant $variant
     * @return array
     */
    public function transformVariant(Variant $variant): array
    {
        return [
            'id' => $variant->id,
            'code' => $variant->code,
            'name' => $variant->name,
            'image' => $variant->image_url,
            'gender' => $variant->gender,
            'is_active' => $variant->is_active,
            'description' => $variant->description,
            'sort_order' => $variant->sort_order,
            'created_at' => $variant->created_at->format('d M Y'),
        ];
    }
}
