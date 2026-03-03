<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Warehouse extends Model
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
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

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

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Case-insensitive search lintas kolom penting.
     * Menggunakan LOWER() agar portable di MySQL & PostgreSQL.
     */
    public function scopeSearch($query, string $search)
    {
        $term = strtolower($search);

        return $query->where(function ($q) use ($term) {
            $q->whereRaw('LOWER(name) LIKE ?',         ["%{$term}%"])
              ->orWhereRaw('LOWER(code) LIKE ?',        ["%{$term}%"])
              ->orWhereRaw('LOWER(manager_name) LIKE ?', ["%{$term}%"])
              ->orWhereRaw('LOWER(email) LIKE ?',       ["%{$term}%"])
              ->orWhereRaw('LOWER(phone) LIKE ?',       ["%{$term}%"]);
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
}
