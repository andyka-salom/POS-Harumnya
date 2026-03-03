<?php

namespace App\Http\Requests\Intensity;

use Illuminate\Foundation\Http\FormRequest;

class StoreIntensityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code'      => 'required|string|max:10|unique:intensities,code',
            'name'      => 'required|string|max:100',
            'oil_ratio' => 'required|numeric|min:1|max:99',
            // alcohol_ratio dihitung otomatis di model boot(), tapi tetap dikirim dari FE untuk UX
            'alcohol_ratio' => 'required|numeric|min:1|max:99',
            'sort_order'    => 'required|integer|min:0',
            'is_active'     => 'required|boolean',
        ];
    }

    /**
     * Validasi tambahan: pastikan oil + alcohol = 100
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $oil   = (float) $this->input('oil_ratio', 0);
            $alkoh = (float) $this->input('alcohol_ratio', 0);

            if (abs(($oil + $alkoh) - 100) > 0.1) {
                $validator->errors()->add(
                    'oil_ratio',
                    "Total ratio harus 100% (saat ini: " . number_format($oil + $alkoh, 2) . "%)"
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'code.required'         => 'Kode intensitas wajib diisi.',
            'code.unique'           => 'Kode intensitas sudah digunakan.',
            'code.max'              => 'Kode maksimal 10 karakter.',
            'name.required'         => 'Nama intensitas wajib diisi.',
            'name.max'              => 'Nama maksimal 100 karakter.',
            'oil_ratio.required'    => 'Ratio bibit wajib diisi.',
            'oil_ratio.min'         => 'Ratio bibit minimal 1%.',
            'oil_ratio.max'         => 'Ratio bibit maksimal 99%.',
            'alcohol_ratio.required' => 'Ratio alkohol wajib diisi.',
            'alcohol_ratio.min'     => 'Ratio alkohol minimal 1%.',
            'alcohol_ratio.max'     => 'Ratio alkohol maksimal 99%.',
            'sort_order.required'   => 'Urutan tampilan wajib diisi.',
            'sort_order.min'        => 'Urutan minimal 0.',
            'is_active.required'    => 'Status wajib dipilih.',
        ];
    }
}
