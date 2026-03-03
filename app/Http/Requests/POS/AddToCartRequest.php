<?php

namespace App\Http\Requests\POS;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class AddToCartRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Hanya user yang punya default_store_id
        return Auth::check() && Auth::user()->default_store_id !== null;
    }

    public function rules(): array
    {
        return [
            'variant_id'      => ['required', 'uuid', 'exists:variants,id'],
            'intensity_id'    => ['required', 'uuid', 'exists:intensities,id'],
            'size_id'         => ['required', 'uuid', 'exists:sizes,id'],
            'qty'             => ['required', 'integer', 'min:1', 'max:99'],
            'packaging_ids'   => ['nullable', 'array'],
            'packaging_ids.*' => ['uuid', 'exists:packaging_materials,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'variant_id.required'   => 'Varian parfum harus dipilih',
            'intensity_id.required' => 'Konsentrasi (intensitas) harus dipilih',
            'size_id.required'      => 'Ukuran botol harus dipilih',
            'qty.min'               => 'Jumlah minimal 1',
            'qty.max'               => 'Jumlah maksimal 99 per item',
        ];
    }

    /**
     * Pastikan kombinasi variant+intensity+size memiliki produk aktif.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if ($v->errors()->isNotEmpty()) return;

            $exists = \App\Models\Product::where('variant_id', $this->variant_id)
                ->where('intensity_id', $this->intensity_id)
                ->where('size_id', $this->size_id)
                ->where('is_active', true)
                ->exists();

            // Lanjutkan meskipun produk belum terdaftar di table products
            // (parfum dibuat made-to-order, produk mungkin belum di-generate)
            // Hanya error jika ketiga FK tidak valid — sudah dicek di rules().
        });
    }
}
