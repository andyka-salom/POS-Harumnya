<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'name'                 => $this->name,
            'email'                => $this->email,
            'avatar'               => $this->avatar,
            // 'email_verified_at'    => $this->email_verified_at?->toIso8601String(),
            'default_store_id'     => $this->default_store_id,
            'default_warehouse_id' => $this->default_warehouse_id,
            'roles'                => $this->getRoleNames(),
            // 'permissions'          => $this->getPermissionsArray(),
            // 'is_super_admin'       => $this->isSuperAdmin(),
            'created_at'           => $this->created_at->toIso8601String(),
        ];
    }
}
