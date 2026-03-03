<?php

namespace App\Http\Requests\Purchase;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => 'required|exists:suppliers,id',
            'destination_type' => 'required|in:App\\Models\\Warehouse,App\\Models\\Store',
            'destination_id' => 'required|uuid',
            'purchase_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:purchase_date',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',

            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:App\\Models\\Ingredient,App\\Models\\PackagingMaterial',
            'items.*.item_id' => 'required|uuid',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required' => 'Supplier wajib dipilih',
            'supplier_id.exists' => 'Supplier tidak valid',
            'destination_type.required' => 'Tujuan pengiriman wajib dipilih',
            'destination_id.required' => 'Lokasi tujuan wajib dipilih',
            'purchase_date.required' => 'Tanggal pembelian wajib diisi',
            'expected_delivery_date.after_or_equal' => 'Tanggal estimasi harus sama atau setelah tanggal pembelian',

            'items.required' => 'Minimal 1 item harus ditambahkan',
            'items.*.quantity.min' => 'Kuantitas minimal 0.0001',
            'items.*.unit_price.min' => 'Harga satuan tidak boleh negatif',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'tax' => $this->tax ?? 0,
            'discount' => $this->discount ?? 0,
            'shipping_cost' => $this->shipping_cost ?? 0,
        ]);
    }
}
