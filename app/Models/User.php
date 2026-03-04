<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;          // ← tambahkan ini
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'default_store_id',
        'default_warehouse_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'    => 'datetime',
            'password'             => 'hashed',
            // Jika store/warehouse pakai UUID cast ke string
            // Jika pakai bigIncrements (integer) - hapus dua baris ini
            'default_store_id'     => 'string',
            'default_warehouse_id' => 'string',
        ];
    }

    /**
     * Relasi ke Store
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'default_store_id');
    }

    /**
     * Relasi ke Warehouse
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'default_warehouse_id');
    }

    /**
     * Cek apakah user adalah super admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super-admin');
    }

    /**
     * Kembalikan semua permissions sebagai array key => bool
     * Digunakan untuk dikirim ke frontend via Inertia shared data
     */
    public function getPermissionsArray(): array
    {
        return $this->getAllPermissions()
            ->mapWithKeys(fn ($permission) => [$permission->name => true])
            ->toArray();
    }
        public function getPermissions()
    {
        return $this->getAllPermissions()->mapWithKeys(function ($permission) {
            return [$permission->name => true];
        });
    }
}
