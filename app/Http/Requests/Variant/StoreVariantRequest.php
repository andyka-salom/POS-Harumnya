<?php

namespace App\Http\Requests\Variant;

use Illuminate\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;

class StoreVariantRequest extends FormRequest
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
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[A-Z0-9\-]+$/',
                Rule::unique('variants', 'code')->whereNull('deleted_at'),
            ],
            'name' => 'required|string|max:255',
            'gender' => ['required', Rule::in(['male', 'female', 'unisex'])],
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096', // 4MB max
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'code' => 'kode varian',
            'name' => 'nama varian',
            'gender' => 'gender',
            'description' => 'deskripsi',
            'image' => 'gambar',
            'is_active' => 'status aktif',
            'sort_order' => 'urutan',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'Kode varian wajib diisi',
            'code.unique' => 'Kode varian sudah digunakan',
            'code.regex' => 'Kode varian hanya boleh mengandung huruf kapital, angka, dan tanda strip (-)',
            'name.required' => 'Nama varian wajib diisi',
            'gender.required' => 'Gender wajib dipilih',
            'gender.in' => 'Gender yang dipilih tidak valid',
            'image.required' => 'Gambar varian wajib diupload',
            'image.image' => 'File harus berupa gambar',
            'image.mimes' => 'Format gambar harus JPG, JPEG, PNG, atau WEBP',
            'image.max' => 'Ukuran gambar maksimal 4MB',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Auto-uppercase code
        if ($this->has('code')) {
            $this->merge([
                'code' => strtoupper($this->code),
            ]);
        }

        // Set default values
        $this->merge([
            'is_active' => $this->boolean('is_active', true),
            'sort_order' => $this->input('sort_order', 0),
        ]);
    }
}
