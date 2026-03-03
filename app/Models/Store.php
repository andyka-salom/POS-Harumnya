<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'address',
        'phone',
        'manager_name',
        'email',
        'is_active',
        'store_category_id',   // ← tambahan migration 011
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Kategori toko (L / M / S).
     * Null = tidak dikategorikan → semua variant tampil di POS.
     */
    public function storeCategory(): BelongsTo
    {
        return $this->belongsTo(StoreCategory::class, 'store_category_id');
    }

    /**
     * Stok ingredient di toko ini.
     */
    public function ingredientStocks(): HasMany
    {
        return $this->hasMany(StoreIngredientStock::class, 'store_id');
    }

    /**
     * Stok packaging di toko ini.
     */
    public function packagingStocks(): HasMany
    {
        return $this->hasMany(StorePackagingStock::class, 'store_id');
    }

    /**
     * Sales person yang terdaftar di toko ini.
     */
    public function salesPeople(): HasMany
    {
        return $this->hasMany(SalesPerson::class, 'store_id');
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    public function getStatusLabelAttribute(): string
    {
        return $this->is_active ? 'Aktif' : 'Non-Aktif';
    }

    /**
     * Ringkasan kontak: email jika ada, fallback ke phone.
     */
    public function getContactSummaryAttribute(): string
    {
        return $this->email ?? $this->phone ?? '—';
    }

    /**
     * Label kategori singkat untuk ditampilkan di UI.
     * Contoh: "L — Large", atau "—" jika tidak ada kategori.
     */
    public function getCategoryLabelAttribute(): string
    {
        if (! $this->storeCategory) {
            return '—';
        }

        return $this->storeCategory->code . ' — ' . $this->storeCategory->name;
    }

    /**
     * Apakah store ini punya filter variant aktif.
     * True  = hanya variant tertentu yang boleh dijual (whitelist aktif).
     * False = semua variant boleh dijual.
     */
    public function getHasVariantFilterAttribute(): bool
    {
        if (! $this->store_category_id) {
            return false;
        }

        return ! ($this->storeCategory->allow_all_variants ?? true);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Case-insensitive search lintas kolom penting.
     */
    public function scopeSearch($query, string $search)
    {
        $term = strtolower($search);

        return $query->where(function ($q) use ($term) {
            $q->whereRaw('LOWER(name) LIKE ?',          ["%{$term}%"])
              ->orWhereRaw('LOWER(code) LIKE ?',         ["%{$term}%"])
              ->orWhereRaw('LOWER(manager_name) LIKE ?', ["%{$term}%"])
              ->orWhereRaw('LOWER(email) LIKE ?',        ["%{$term}%"])
              ->orWhereRaw('LOWER(phone) LIKE ?',        ["%{$term}%"]);
        });
    }

    public function scopeActive($query, bool $active = true)
    {
        return $query->where('is_active', $active);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('name', 'asc');
    }

    /**
     * Filter berdasarkan kategori toko.
     */
    public function scopeByCategory($query, string $categoryId)
    {
        return $query->where('store_category_id', $categoryId);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Ambil variant yang boleh dijual di store ini.
     * Dipakai di POS saat load daftar variant.
     *
     * Logika:
     *   1. Store tanpa kategori           → semua variant aktif
     *   2. Kategori allow_all_variants    → semua variant aktif
     *   3. Kategori whitelist aktif       → hanya variant di store_category_variants
     */
    public function getAllowedVariants()
    {
        // Tidak ada kategori → semua variant
        if (! $this->store_category_id) {
            return Variant::where('is_active', true)->ordered()->get();
        }

        $category = $this->storeCategory;

        // Kategori allow_all → semua variant
        if ($category->allow_all_variants) {
            return Variant::where('is_active', true)->ordered()->get();
        }

        // Whitelist: hanya variant yang ada di store_category_variants
        return Variant::where('is_active', true)
            ->whereHas('storeCategories', fn ($q) =>
                $q->where('store_category_id', $this->store_category_id)
                  ->where('is_active', true)
            )
            ->ordered()
            ->get();
    }
}
