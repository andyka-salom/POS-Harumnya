<?php

namespace App\Http\Requests\BottlePrice;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBottlePriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:255'],
            'size_id'    => ['required', 'uuid', 'exists:sizes,id'],
            'price'      => ['required', 'numeric', 'min:0'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'is_active'  => ['boolean'],
            'image'      => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
