<?php

namespace App\Http\Requests\POS;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Auth::check();
    }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:255'],
            'phone'      => ['required', 'string', 'max:20', 'unique:customers,phone'],
            'email'      => ['nullable', 'email', 'max:100', 'unique:customers,email'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'gender'     => ['nullable', 'in:male,female,other'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'    => 'Nama pelanggan wajib diisi',
            'phone.required'   => 'Nomor HP wajib diisi',
            'phone.unique'     => 'Nomor HP ini sudah terdaftar',
            'email.unique'     => 'Email ini sudah terdaftar',
            'birth_date.before' => 'Tanggal lahir harus sebelum hari ini',
        ];
    }
}
