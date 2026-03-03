<?php

namespace App\Http\Requests\Size;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSizeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var \App\Models\Size $size */
        $size = $this->route('size');

        return [
            'volume_ml'  => [
                'required', 'integer', 'min:1',
                Rule::unique('sizes', 'volume_ml')->ignore($size->id),
            ],
            'name'       => 'required|string|max:50',
            'sort_order' => 'required|integer|min:0',
            'is_active'  => 'required|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'volume_ml.required'  => 'Volume (ml) wajib diisi.',
            'volume_ml.integer'   => 'Volume harus berupa angka bulat.',
            'volume_ml.min'       => 'Volume minimal 1 ml.',
            'volume_ml.unique'    => 'Volume :input ml sudah digunakan oleh ukuran lain.',
            'name.required'       => 'Nama ukuran wajib diisi.',
            'name.max'            => 'Nama ukuran maksimal 50 karakter.',
            'sort_order.required' => 'Urutan tampilan wajib diisi.',
            'sort_order.integer'  => 'Urutan harus berupa angka.',
            'sort_order.min'      => 'Urutan minimal 0.',
            'is_active.required'  => 'Status wajib dipilih.',
            'is_active.boolean'   => 'Status tidak valid.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'volume_ml'  => (int) $this->volume_ml,
            'sort_order' => (int) ($this->sort_order ?? 0),
        ]);
    }
}
