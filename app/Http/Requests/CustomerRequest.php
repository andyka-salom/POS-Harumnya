<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $customerId = $this->route('customer')?->id;

        return [
            'name'       => ['required', 'string', 'max:255'],
            'phone'      => ['nullable', 'string', 'max:20', Rule::unique('customers', 'phone')->ignore($customerId)],
            'email'      => ['nullable', 'email', 'max:100'],
            'address'    => ['nullable', 'string'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'gender'     => ['nullable', Rule::in(['male', 'female', 'other'])],
            'points'     => ['nullable', 'integer', 'min:0'],
            'is_active'  => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'   => 'Nama pelanggan wajib diisi.',
            'phone.unique'    => 'Nomor telepon sudah terdaftar.',
            'email.email'     => 'Format email tidak valid.',
            'birth_date.before' => 'Tanggal lahir harus sebelum hari ini.',
            'gender.in'       => 'Jenis kelamin tidak valid.',
        ];
    }
}
