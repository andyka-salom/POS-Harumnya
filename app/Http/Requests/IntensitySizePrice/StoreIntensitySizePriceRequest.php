<?php

namespace App\Http\Requests\IntensitySizePrice;

use App\Models\IntensitySizePrice;
use Illuminate\Foundation\Http\FormRequest;

class StoreIntensitySizePriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'intensity_id' => 'required|uuid|exists:intensities,id',
            'size_id'      => 'required|uuid|exists:sizes,id',
            'price'        => 'required|numeric|min:0',
            'is_active'    => 'required|boolean',
            'notes'        => 'nullable|string|max:500',
        ];
    }

    /**
     * Validasi kombinasi intensity+size harus unik (sesuai DB unique constraint).
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if ($v->errors()->count()) return; // skip jika field sudah error

            $exists = IntensitySizePrice::where('intensity_id', $this->intensity_id)
                ->where('size_id', $this->size_id)
                ->exists();

            if ($exists) {
                $v->errors()->add('intensity_id', 'Kombinasi intensitas dan ukuran ini sudah memiliki harga.');
                $v->errors()->add('size_id', 'Kombinasi intensitas dan ukuran ini sudah memiliki harga.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'intensity_id.required' => 'Intensitas wajib dipilih.',
            'intensity_id.uuid'     => 'Intensitas tidak valid.',
            'intensity_id.exists'   => 'Intensitas tidak ditemukan.',
            'size_id.required'      => 'Ukuran wajib dipilih.',
            'size_id.uuid'          => 'Ukuran tidak valid.',
            'size_id.exists'        => 'Ukuran tidak ditemukan.',
            'price.required'        => 'Harga wajib diisi.',
            'price.numeric'         => 'Harga harus berupa angka.',
            'price.min'             => 'Harga tidak boleh negatif.',
            'is_active.required'    => 'Status wajib dipilih.',
            'is_active.boolean'     => 'Status tidak valid.',
            'notes.max'             => 'Catatan maksimal 500 karakter.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'price' => is_numeric($this->price) ? (float) $this->price : $this->price,
        ]);
    }
}
