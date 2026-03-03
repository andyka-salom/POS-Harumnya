<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $roleId = $this->route('role') ? $this->route('role')->id : null;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                'unique:roles,name,' . $roleId
            ],
            'selectedPermission' => ['required', 'array', 'min:1'],
            'selectedPermission.*' => ['exists:permissions,name'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'Nama role sudah digunakan.',
            'selectedPermission.required' => 'Pilih minimal satu permission.',
        ];
    }
}
