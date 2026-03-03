<?php

namespace App\Http\Requests\StockAdjustment;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'location_type' => 'required|in:App\\Models\\Warehouse,App\\Models\\Store',
            'location_id' => 'required|uuid',
            'adjustment_date' => 'required|date',
            'adjustment_type' => 'required|in:adjustment_in,adjustment_out,waste,found,damaged,expired',
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string|max:1000',

            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:App\\Models\\Ingredient,App\\Models\\PackagingMaterial',
            'items.*.item_id' => 'required|uuid',
            'items.*.quantity_adjustment' => 'required|numeric|not_in:0',
            'items.*.reason' => 'nullable|string|max:255',
            'items.*.notes' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'location_type.required' => 'Tipe lokasi wajib dipilih',
            'location_id.required' => 'Lokasi wajib dipilih',
            'adjustment_date.required' => 'Tanggal adjustment wajib diisi',
            'adjustment_type.required' => 'Tipe adjustment wajib dipilih',
            'reason.required' => 'Alasan adjustment wajib diisi',

            'items.required' => 'Minimal 1 item harus ditambahkan',
            'items.*.quantity_adjustment.not_in' => 'Kuantitas adjustment tidak boleh 0',
        ];
    }
}
