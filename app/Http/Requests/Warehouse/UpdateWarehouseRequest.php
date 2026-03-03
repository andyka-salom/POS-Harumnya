<?php

namespace App\Http\Requests\Warehouse;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWarehouseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        /** @var \App\Models\Warehouse $warehouse */
        $warehouse = $this->route('warehouse');

        return [
            'code'         => ['required', 'string', 'max:50', Rule::unique('warehouses', 'code')->ignore($warehouse->id)],
            'name'         => 'required|string|max:255',
            'address'      => 'nullable|string',
            'phone'        => 'nullable|string|max:50',
            'manager_name' => 'nullable|string|max:255',
            'email'        => 'nullable|email|max:255',
            'is_active'    => 'required|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'code.required'      => 'Kode gudang wajib diisi.',
            'code.max'           => 'Kode gudang maksimal 50 karakter.',
            'code.unique'        => 'Kode gudang :input sudah digunakan gudang lain.',
            'name.required'      => 'Nama gudang wajib diisi.',
            'name.max'           => 'Nama gudang maksimal 255 karakter.',
            'phone.max'          => 'Nomor telepon maksimal 50 karakter.',
            'email.email'        => 'Format email tidak valid.',
            'is_active.required' => 'Status wajib dipilih.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper(trim($this->code ?? '')),
        ]);
    }
}
