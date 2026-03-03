<?php

namespace App\Http\Requests\IngredientCategory;

use Illuminate\Foundation\Http\FormRequest;

class StoreIngredientCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Adjust authorization logic as needed
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'code' => 'required|string|max:50|unique:ingredient_categories,code',
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     */
    public function messages(): array
    {
        return [
            'code.required' => 'Kode kategori wajib diisi.',
            'code.string' => 'Kode kategori harus berupa teks.',
            'code.max' => 'Kode kategori tidak boleh lebih dari 50 karakter.',
            'code.unique' => 'Kode kategori sudah digunakan.',
            'name.required' => 'Nama kategori wajib diisi.',
            'name.string' => 'Nama kategori harus berupa teks.',
            'name.max' => 'Nama kategori tidak boleh lebih dari 100 karakter.',
            'description.string' => 'Deskripsi harus berupa teks.',
            'is_active.boolean' => 'Status aktif harus berupa boolean.',
        ];
    }
}
