<?php

namespace App\Http\Requests\Discount;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDiscountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // ── Basic ────────────────────────────────────────────────────────
            'code'                  => ['required', 'string', 'max:50', 'unique:discount_types,code'],
            'name'                  => ['required', 'string', 'max:255'],
            'type'                  => ['required', Rule::in(['percentage', 'fixed_amount', 'buy_x_get_y', 'free_product', 'game_reward', 'bundle'])],
            'value'                 => ['required', 'numeric', 'min:0'],
            'description'           => ['nullable', 'string'],
            'terms_conditions'      => ['nullable', 'array'],

            // ── Buy X Get Y ──────────────────────────────────────────────────
            'buy_quantity'          => ['nullable', 'integer', 'min:1'],
            'get_quantity'          => ['nullable', 'integer', 'min:1'],
            'get_product_type'      => ['nullable', Rule::in(['same', 'specific', 'lower_intensity', 'choose_from_pool', 'choose_variant'])],

            // ── Constraints ──────────────────────────────────────────────────
            'min_purchase_amount'   => ['nullable', 'numeric', 'min:0'],
            'min_purchase_quantity' => ['nullable', 'integer', 'min:0'],
            'max_discount_amount'   => ['nullable', 'numeric', 'min:0'],

            // ── Period ───────────────────────────────────────────────────────
            'start_date'            => ['nullable', 'date'],
            'end_date'              => ['nullable', 'date', 'after_or_equal:start_date'],

            // ── Game ─────────────────────────────────────────────────────────
            'is_game_reward'        => ['boolean'],
            'game_probability'      => ['nullable', 'integer', 'min:1', 'max:100'],

            // ── Priority & Combinability ─────────────────────────────────────
            'priority'              => ['integer', 'min:0'],
            'is_combinable'         => ['boolean'],
            'is_active'             => ['boolean'],

            // ── Stores ───────────────────────────────────────────────────────
            'store_ids'             => ['nullable', 'array'],
            'store_ids.*'           => ['uuid', 'exists:stores,id'],

            // ── Applicabilities ──────────────────────────────────────────────
            'applicabilities'                    => ['nullable', 'array'],
            'applicabilities.*.variant_id'       => ['nullable', 'uuid', 'exists:variants,id'],
            'applicabilities.*.intensity_id'     => ['nullable', 'uuid', 'exists:intensities,id'],
            'applicabilities.*.size_id'          => ['nullable', 'uuid', 'exists:sizes,id'],

            // ── Requirements ─────────────────────────────────────────────────
            'requirements'                       => ['nullable', 'array'],
            'requirements.*.variant_id'          => ['nullable', 'uuid', 'exists:variants,id'],
            'requirements.*.intensity_id'        => ['nullable', 'uuid', 'exists:intensities,id'],
            'requirements.*.size_id'             => ['nullable', 'uuid', 'exists:sizes,id'],
            'requirements.*.required_quantity'   => ['required_with:requirements', 'integer', 'min:1'],
            'requirements.*.matching_mode'       => ['nullable', Rule::in(['all', 'any'])],
            'requirements.*.group_key'           => ['nullable', 'string', 'max:50'],

            // ── Rewards ──────────────────────────────────────────────────────
            'rewards'                            => ['nullable', 'array'],
            'rewards.*.variant_id'               => ['nullable', 'uuid', 'exists:variants,id'],
            'rewards.*.intensity_id'             => ['nullable', 'uuid', 'exists:intensities,id'],
            'rewards.*.size_id'                  => ['nullable', 'uuid', 'exists:sizes,id'],
            'rewards.*.reward_quantity'          => ['required_with:rewards', 'integer', 'min:1'],
            'rewards.*.customer_can_choose'      => ['boolean'],
            'rewards.*.is_pool'                  => ['boolean'],
            'rewards.*.max_choices'              => ['nullable', 'integer', 'min:1'],
            'rewards.*.discount_percentage'      => ['nullable', 'numeric', 'min:0', 'max:100'],
            'rewards.*.fixed_price'              => ['nullable', 'numeric', 'min:0'],
            'rewards.*.priority'                 => ['integer', 'min:0'],

            // ── Reward Pools ─────────────────────────────────────────────────
            'rewards.*.pools'                    => ['nullable', 'array'],
            'rewards.*.pools.*.label'            => ['required_with:rewards.*.pools', 'string', 'max:255'],
            'rewards.*.pools.*.product_id'       => ['nullable', 'uuid', 'exists:products,id'],
            'rewards.*.pools.*.variant_id'       => ['nullable', 'uuid', 'exists:variants,id'],
            'rewards.*.pools.*.intensity_id'     => ['nullable', 'uuid', 'exists:intensities,id'],
            'rewards.*.pools.*.size_id'          => ['nullable', 'uuid', 'exists:sizes,id'],
            'rewards.*.pools.*.fixed_price'      => ['nullable', 'numeric', 'min:0'],
            'rewards.*.pools.*.probability'      => ['nullable', 'integer', 'min:1', 'max:100'],
            'rewards.*.pools.*.image_url'        => ['nullable', 'url'],
            'rewards.*.pools.*.sort_order'       => ['integer', 'min:0'],
            'rewards.*.pools.*.is_active'        => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.unique'                           => 'Kode promo sudah digunakan.',
            'end_date.after_or_equal'               => 'Tanggal selesai harus sama atau setelah tanggal mulai.',
            'requirements.*.required_quantity.min'  => 'Kuantitas syarat minimal 1.',
            'rewards.*.reward_quantity.min'         => 'Kuantitas reward minimal 1.',
            'rewards.*.pools.*.label.required_with' => 'Label pool reward wajib diisi.',
        ];
    }
}
