<?php

namespace App\Http\Requests\Ingredient;

use Illuminate\Foundation\Http\FormRequest;

class StoreIngredientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ingredient_category_id' => ['required', 'uuid', 'exists:ingredient_categories,id'],
            'code'                   => ['required', 'string', 'max:100', 'unique:ingredients,code,NULL,id,deleted_at,NULL'],
            'name'                   => ['required', 'string', 'max:255'],
            'unit'                   => ['required', 'string', 'max:50'],
            'cost_price'             => ['required', 'numeric', 'min:0'],
            'effective_date'         => ['nullable', 'date'],
            'price_note'             => ['nullable', 'string', 'max:500'],
            'is_compound'            => ['boolean'],
            'description'            => ['nullable', 'string'],
            'is_active'              => ['boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'ingredient_category_id' => 'kategori bahan',
            'code'                   => 'kode bahan',
            'name'                   => 'nama bahan',
            'cost_price'             => 'harga pokok',
            'unit'                   => 'satuan',
            'effective_date'         => 'tanggal berlaku',
            'price_note'             => 'catatan harga',
        ];
    }
}
