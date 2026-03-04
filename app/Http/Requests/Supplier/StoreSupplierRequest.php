<?php

namespace App\Http\Requests\Supplier;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $supplierId = $this->route('supplier')?->id;

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('suppliers', 'code')
                    ->ignore($supplierId)
                    ->whereNull('deleted_at'),
            ],
            'name'           => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone'          => ['nullable', 'string', 'max:50'],
            'email'          => ['nullable', 'email', 'max:255'],
            'address'        => ['nullable', 'string'],
            'payment_term'   => ['required', Rule::in(['cash', 'credit_7', 'credit_14', 'credit_30', 'credit_60'])],
            'credit_limit'   => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'is_active'      => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required'         => 'Kode supplier wajib diisi.',
            'code.max'              => 'Kode supplier maksimal 50 karakter.',
            'code.unique'           => 'Kode supplier sudah digunakan.',
            'name.required'         => 'Nama perusahaan wajib diisi.',
            'name.max'              => 'Nama perusahaan maksimal 255 karakter.',
            'email.email'           => 'Format email tidak valid.',
            'phone.max'             => 'Nomor telepon maksimal 50 karakter.',
            'payment_term.required' => 'Termin pembayaran wajib dipilih.',
            'payment_term.in'       => 'Termin pembayaran tidak valid.',
            'credit_limit.numeric'  => 'Batas kredit harus berupa angka.',
            'credit_limit.min'      => 'Batas kredit tidak boleh negatif.',
            'credit_limit.max'      => 'Batas kredit melebihi batas maksimum.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            // Backend selalu paksa 0 jika cash — defence layer
            // agar nilai lama tidak ikut tersimpan walau dikirim dari frontend
            'credit_limit' => $this->payment_term === 'cash'
                ? 0
                : max(0, (float) ($this->credit_limit ?? 0)),
            'is_active' => $this->boolean('is_active', true),
        ]);
    }
}
