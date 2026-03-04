<?php

namespace App\Http\Requests\Ingredient;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIngredientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('ingredient')->id;

        return [
            'ingredient_category_id' => ['required', 'uuid', 'exists:ingredient_categories,id'],
            'code' => [
                'required', 'string', 'max:100',
                Rule::unique('ingredients')->ignore($id)->whereNull('deleted_at'),
            ],
            'name'        => ['required', 'string', 'max:255'],
            'unit'        => ['required', 'string', Rule::in(['ml', 'gr', 'kg', 'liter', 'pcs'])],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            // image nullable — jika tidak dikirim, foto lama tetap dipertahankan
            'image'       => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'is_active'   => ['boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'ingredient_category_id' => 'kategori bahan',
            'code'                   => 'kode bahan',
            'name'                   => 'nama bahan',
            'unit'                   => 'satuan',
        ];
    }
}
