<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Mendapatkan ID user dari route untuk pengecualian unique email saat update
        // Misal route: /users/{user} -> maka $this->route('user') mengambil model user tersebut
        $user = $this->route('user');
        $userId = $user ? $user->id : null;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email,' . $userId
            ],
            // Password wajib saat create (POST), opsional saat update (PUT/PATCH)
            'password' => $this->isMethod('POST')
                ? ['required', 'confirmed', Password::defaults()]
                : ['nullable', 'confirmed', Password::defaults()],

            'toko_id' => ['nullable', 'exists:stores,id'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['exists:roles,name'],
        ];
    }

    public function messages(): array
    {
        return [
            'roles.required' => 'Pilih minimal satu role untuk user ini.',
            'roles.*.exists' => 'Role yang dipilih tidak valid.',
            'toko_id.exists' => 'Toko yang dipilih tidak terdaftar.',
            'email.unique' => 'Email ini sudah digunakan oleh pengguna lain.',
        ];
    }
}
