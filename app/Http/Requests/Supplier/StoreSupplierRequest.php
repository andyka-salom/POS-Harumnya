<?php

namespace App\Http\Requests\Supplier;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupplierRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $supplierId = $this->route('supplier')?->id;

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[A-Z0-9\-]+$/',
                Rule::unique('suppliers', 'code')
                    ->ignore($supplierId)
                    ->whereNull('deleted_at'),
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                'min:3',
            ],
            'contact_person' => [
                'nullable',
                'string',
                'max:255',
            ],
            'phone' => [
                'nullable',
                'string',
                'max:50',
                'regex:/^[0-9\+\-\(\)\s]+$/',
            ],
            'email' => [
                'nullable',
                'email:rfc,dns',
                'max:255',
                Rule::unique('suppliers', 'email')
                    ->ignore($supplierId)
                    ->whereNull('deleted_at'),
            ],
            'address' => [
                'nullable',
                'string',
                'max:1000',
            ],
            'tax_id' => [
                'nullable',
                'string',
                'max:255',
            ],
            'payment_term' => [
                'required',
                Rule::in(['cash', 'credit_7', 'credit_14', 'credit_30', 'credit_60']),
            ],
            'credit_limit' => [
                'required',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],
            'is_active' => [
                'required',
                'boolean',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'code.required' => 'Kode supplier wajib diisi',
            'code.unique' => 'Kode supplier sudah digunakan',
            'code.regex' => 'Kode hanya boleh huruf kapital, angka, dan tanda hubung',
            'name.required' => 'Nama perusahaan wajib diisi',
            'name.min' => 'Nama minimal 3 karakter',
            'email.email' => 'Format email tidak valid',
            'email.unique' => 'Email sudah terdaftar',
            'phone.regex' => 'Format nomor telepon tidak valid',
            'payment_term.in' => 'Termin pembayaran tidak valid',
            'credit_limit.numeric' => 'Batas kredit harus berupa angka',
            'credit_limit.min' => 'Batas kredit tidak boleh negatif',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper($this->code),
            'email' => $this->email ? strtolower(trim($this->email)) : null,
            'credit_limit' => $this->credit_limit ?? 0,
        ]);
    }
}
