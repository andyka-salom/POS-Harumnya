<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $storeId = $this->route('store')->id;

        return [
            'code'               => ['required', 'string', 'max:50', Rule::unique('stores', 'code')->ignore($storeId)],
            'name'               => ['required', 'string', 'max:255'],
            'address'            => ['nullable', 'string'],
            'phone'              => ['nullable', 'string', 'max:50'],
            'manager_name'       => ['nullable', 'string', 'max:255'],
            'email'              => ['nullable', 'email', 'max:255'],
            'is_active'          => ['boolean'],
            'store_category_id'  => ['nullable', 'uuid', 'exists:store_categories,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required'              => 'Kode toko wajib diisi.',
            'code.unique'                => 'Kode toko sudah digunakan.',
            'code.max'                   => 'Kode toko maksimal 50 karakter.',
            'name.required'              => 'Nama toko wajib diisi.',
            'email.email'                => 'Format email tidak valid.',
            'store_category_id.exists'   => 'Kategori toko tidak ditemukan.',
        ];
    }
}
