<?php

namespace App\Http\Requests\StockTransfer;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStockTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_location_type' => 'required|in:App\\Models\\Warehouse,App\\Models\\Store',
            'from_location_id' => 'required|uuid',
            'to_location_type' => 'required|in:App\\Models\\Warehouse,App\\Models\\Store',
            'to_location_id' => 'required|uuid|different:from_location_id',
            'transfer_date' => 'required|date',
            'expected_arrival_date' => 'nullable|date|after_or_equal:transfer_date',
            'notes' => 'nullable|string|max:1000',

            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:App\\Models\\Ingredient,App\\Models\\PackagingMaterial',
            'items.*.item_id' => 'required|uuid',
            'items.*.quantity_requested' => 'required|numeric|min:0.0001',
            'items.*.notes' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'to_location_id.different' => 'Lokasi tujuan harus berbeda dengan lokasi asal',
            'expected_arrival_date.after_or_equal' => 'Tanggal estimasi harus sama atau setelah tanggal transfer',
            'items.min' => 'Minimal 1 item harus ditambahkan',
            'items.*.quantity_requested.min' => 'Kuantitas minimal 0.0001',
        ];
    }
}
