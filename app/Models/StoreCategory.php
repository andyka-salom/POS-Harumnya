<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class StoreCategory extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'description',
        'allow_all_variants',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'allow_all_variants' => 'boolean',
        'is_active'          => 'boolean',
        'sort_order'         => 'integer',
        'created_at'         => 'datetime',
        'updated_at'         => 'datetime',
        'deleted_at'         => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Toko-toko yang menggunakan kategori ini.
     */
    public function stores(): HasMany
    {
        return $this->hasMany(Store::class, 'store_category_id');
    }

    /**
     * Variant yang di-whitelist untuk kategori ini.
     * Via pivot table store_category_variants.
     */
    public function variants(): BelongsToMany
    {
        return $this->belongsToMany(
            Variant::class,
            'store_category_variants',
            'store_category_id',
            'variant_id'
        )
        ->withPivot('is_active')
        ->withTimestamps();
    }

    /**
     * Hanya variant yang aktif di whitelist.
     */
    public function activeVariants(): BelongsToMany
    {
        return $this->variants()->wherePivot('is_active', true);
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    public function getVariantCountAttribute(): int
    {
        return $this->variants()->wherePivot('is_active', true)->count();
    }

    public function getStoreCountAttribute(): int
    {
        return $this->stores()->count();
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('code');
    }

    public function scopeSearch($query, string $search)
    {
        $term = strtolower($search);

        return $query->where(function ($q) use ($term) {
            $q->whereRaw('LOWER(code) LIKE ?', ["%{$term}%"])
              ->orWhereRaw('LOWER(name) LIKE ?', ["%{$term}%"]);
        });
    }
       public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'variant_id');
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(VariantRecipe::class, 'variant_id');
    }

    /** Relasi ke store_categories via store_category_variants. */
    public function storeCategories(): BelongsToMany
    {
        return $this->belongsToMany(StoreCategory::class, 'store_category_variants', 'variant_id', 'store_category_id')
            ->withPivot('is_active')
            ->withTimestamps();
    }
}
