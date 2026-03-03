<?php

namespace App\Http\Requests\WarehouseStock;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWarehouseStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_type' => ['required', 'in:ingredient,packaging'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'max_stock' => ['nullable', 'numeric', 'min:0', 'gte:min_stock'],
        ];
    }

    public function messages(): array
    {
        return [
            'max_stock.gte' => 'Stok maksimum harus lebih besar atau sama dengan stok minimum.',
        ];
    }
}
