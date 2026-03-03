<?php

namespace App\Http\Requests\POS;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Auth::check() && Auth::user()->default_store_id !== null;
    }

    public function rules(): array
    {
        return [
            // Wajib
            'payment_method_id' => ['required', 'uuid', 'exists:payment_methods,id'],

            // Opsional
            'customer_id'       => ['nullable', 'uuid', 'exists:customers,id'],
            'sales_person_id'   => ['nullable', 'uuid', 'exists:sales_people,id'],
            'discount_type_id'  => ['nullable', 'uuid', 'exists:discount_types,id'],
            'discount_amount'   => ['nullable', 'numeric', 'min:0'],

            // Untuk metode cash: jumlah uang yang diterima dari pelanggan
            'cash_amount'       => ['nullable', 'numeric', 'min:0'],

            // No. referensi opsional (untuk QRIS, transfer, dll.)
            'reference_number'  => ['nullable', 'string', 'max:100'],

            // Standalone packagings dari tab Kemasan (tidak terikat ke cart item)
            'standalone_packagings'                    => ['nullable', 'array'],
            'standalone_packagings.*.packaging_material_id' => ['required', 'uuid', 'exists:packaging_materials,id'],
            'standalone_packagings.*.qty'              => ['required', 'integer', 'min:1', 'max:99'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_method_id.required' => 'Metode pembayaran harus dipilih',
            'payment_method_id.exists'   => 'Metode pembayaran tidak valid',
            'cash_amount.min'            => 'Jumlah pembayaran tidak boleh negatif',
        ];
    }

    /**
     * Validasi tambahan: pastikan cash_amount >= total jika metode is cash.
     * Total dihitung di controller, tapi kita bisa validasi dasar di sini.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if ($v->errors()->isNotEmpty()) return;

            $method = \App\Models\PaymentMethod::find($this->payment_method_id);

            if ($method && ($method->type === 'cash' || $method->can_give_change)) {
                if ($this->filled('cash_amount') && $this->cash_amount < 0) {
                    $v->errors()->add('cash_amount', 'Jumlah pembayaran tidak valid');
                }
            }
        });
    }
}
