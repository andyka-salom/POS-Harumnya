<?php

namespace App\Http\Requests\WarehouseStock;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWarehouseStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $itemType = $this->input('item_type');

        return [
            'item_type' => ['required', 'in:ingredient,packaging'],
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'item_id' => [
                'required',
                $itemType === 'ingredient'
                    ? 'exists:ingredients,id'
                    : 'exists:packaging_materials,id',
                // Prevent duplicate
                Rule::unique($itemType === 'ingredient' ? 'warehouse_ingredient_stocks' : 'warehouse_packaging_stocks')
                    ->where('warehouse_id', $this->warehouse_id)
                    ->where($itemType === 'ingredient' ? 'ingredient_id' : 'packaging_material_id', $this->item_id)
            ],
            'quantity' => ['required', 'numeric', 'min:0'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'max_stock' => ['nullable', 'numeric', 'min:0', 'gte:min_stock'],
            'average_cost' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'item_id.unique' => 'Item ini sudah terdaftar di gudang yang dipilih.',
            'max_stock.gte' => 'Stok maksimum harus lebih besar atau sama dengan stok minimum.',
        ];
    }
}
