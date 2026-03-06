<?php

namespace App\Http\Requests\Discount;

use Illuminate\Foundation\Http\FormRequest;

class StoreDiscountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // ── Identitas ───────────────────────────────────────────────────
            'code'                  => ['required', 'string', 'max:50', 'unique:discount_types,code'],
            'name'                  => ['required', 'string', 'max:255'],
            'description'           => ['nullable', 'string', 'max:2000'],

            // ── Tipe & Nilai ─────────────────────────────────────────────────
            'type'                  => ['required', 'in:percentage,fixed_amount,buy_x_get_y,free_product,game_reward,bundle'],
            'value'                 => ['required_if:type,percentage,fixed_amount', 'nullable', 'numeric', 'min:0'],
            'buy_quantity'          => ['required_if:type,buy_x_get_y,free_product,game_reward', 'nullable', 'integer', 'min:1'],
            'get_quantity'          => ['required_if:type,buy_x_get_y,free_product,game_reward', 'nullable', 'integer', 'min:1'],
            'get_product_type'      => ['nullable', 'in:same,specific,lower_intensity,choose_from_pool,choose_variant'],

            // ── Syarat ──────────────────────────────────────────────────────
            'min_purchase_amount'   => ['nullable', 'numeric', 'min:0'],
            'min_purchase_quantity' => ['nullable', 'integer', 'min:0'],
            'max_discount_amount'   => ['nullable', 'numeric', 'min:0'],

            // ── Periode Tanggal ──────────────────────────────────────────────
            'start_date'            => ['nullable', 'date'],
            'end_date'              => ['nullable', 'date', 'after_or_equal:start_date'],

            // ── Jam Berlaku (Happy Hour) ─────────────────────────────────────
            'start_time'            => ['nullable', 'date_format:H:i'],
            'end_time'              => ['nullable', 'date_format:H:i', 'after:start_time'],

            // ── Game ─────────────────────────────────────────────────────────
            'is_game_reward'        => ['boolean'],
            'game_probability'      => ['nullable', 'integer', 'min:1', 'max:100'],

            // ── Opsi ─────────────────────────────────────────────────────────
            'priority'              => ['nullable', 'integer', 'min:0'],
            'is_combinable'         => ['boolean'],
            'is_active'             => ['boolean'],

            // ── Toko ─────────────────────────────────────────────────────────
            'store_ids'             => ['nullable', 'array'],
            'store_ids.*'           => ['uuid', 'exists:stores,id'],

            // ── Applicabilities ───────────────────────────────────────────────
            'applicabilities'                   => ['nullable', 'array'],
            'applicabilities.*.variant_id'      => ['nullable', 'uuid', 'exists:variants,id'],
            'applicabilities.*.intensity_id'    => ['nullable', 'uuid', 'exists:intensities,id'],
            'applicabilities.*.size_id'         => ['nullable', 'uuid', 'exists:sizes,id'],

            // ── Requirements ──────────────────────────────────────────────────
            'requirements'                          => ['nullable', 'array'],
            'requirements.*.variant_id'             => ['nullable', 'uuid', 'exists:variants,id'],
            'requirements.*.intensity_id'           => ['nullable', 'uuid', 'exists:intensities,id'],
            'requirements.*.size_id'                => ['nullable', 'uuid', 'exists:sizes,id'],
            'requirements.*.required_quantity'      => ['required', 'integer', 'min:1'],
            'requirements.*.matching_mode'          => ['required', 'in:all,any'],
            'requirements.*.group_key'              => ['nullable', 'string', 'max:50'],

            // ── Rewards ───────────────────────────────────────────────────────
            'rewards'                               => ['nullable', 'array'],
            'rewards.*.variant_id'                  => ['nullable', 'uuid', 'exists:variants,id'],
            'rewards.*.intensity_id'                => ['nullable', 'uuid', 'exists:intensities,id'],
            'rewards.*.size_id'                     => ['nullable', 'uuid', 'exists:sizes,id'],
            'rewards.*.reward_quantity'             => ['required', 'integer', 'min:1'],
            'rewards.*.customer_can_choose'         => ['boolean'],
            'rewards.*.is_pool'                     => ['boolean'],
            'rewards.*.max_choices'                 => ['nullable', 'integer', 'min:1'],
            'rewards.*.discount_percentage'         => ['nullable', 'numeric', 'min:0', 'max:100'],
            'rewards.*.fixed_price'                 => ['nullable', 'numeric', 'min:0'],
            'rewards.*.priority'                    => ['nullable', 'integer', 'min:0'],

            // ── Reward Pools ──────────────────────────────────────────────────
            'rewards.*.pools'                       => ['nullable', 'array'],
            'rewards.*.pools.*.product_id'          => ['nullable', 'uuid'],
            'rewards.*.pools.*.variant_id'          => ['nullable', 'uuid', 'exists:variants,id'],
            'rewards.*.pools.*.intensity_id'        => ['nullable', 'uuid', 'exists:intensities,id'],
            'rewards.*.pools.*.size_id'             => ['nullable', 'uuid', 'exists:sizes,id'],
            'rewards.*.pools.*.label'               => ['required', 'string', 'max:255'],
            'rewards.*.pools.*.image_url'           => ['nullable', 'string', 'max:500'],
            'rewards.*.pools.*.fixed_price'         => ['nullable', 'numeric', 'min:0'],
            'rewards.*.pools.*.probability'         => ['nullable', 'integer', 'min:1', 'max:100'],
            'rewards.*.pools.*.is_active'           => ['boolean'],
            'rewards.*.pools.*.sort_order'          => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required'             => 'Kode promo wajib diisi.',
            'code.unique'               => 'Kode promo sudah digunakan, pilih kode lain.',
            'code.max'                  => 'Kode promo maksimal 50 karakter.',
            'name.required'             => 'Nama promo wajib diisi.',
            'type.required'             => 'Tipe diskon wajib dipilih.',
            'type.in'                   => 'Tipe diskon tidak valid.',
            'value.required_if'         => 'Nilai diskon wajib diisi untuk tipe persentase atau nominal.',
            'value.numeric'             => 'Nilai diskon harus berupa angka.',
            'value.min'                 => 'Nilai diskon tidak boleh negatif.',
            'buy_quantity.required_if'  => 'Jumlah beli (X) wajib diisi untuk tipe ini.',
            'buy_quantity.min'          => 'Jumlah beli minimal 1.',
            'get_quantity.required_if'  => 'Jumlah gratis (Y) wajib diisi untuk tipe ini.',
            'get_quantity.min'          => 'Jumlah gratis minimal 1.',
            'end_date.after_or_equal'   => 'Tanggal selesai harus sama atau setelah tanggal mulai.',
            'start_time.date_format'    => 'Format jam mulai tidak valid (HH:MM).',
            'end_time.date_format'      => 'Format jam selesai tidak valid (HH:MM).',
            'end_time.after'            => 'Jam selesai harus setelah jam mulai.',
            'game_probability.min'      => 'Probabilitas game minimal 1%.',
            'game_probability.max'      => 'Probabilitas game maksimal 100%.',
            'store_ids.*.exists'        => 'Salah satu toko yang dipilih tidak ditemukan.',
            'store_ids.*.uuid'          => 'ID toko tidak valid.',
            'requirements.*.required_quantity.required' => 'Min qty pada syarat pembelian wajib diisi.',
            'requirements.*.required_quantity.min'      => 'Min qty harus minimal 1.',
            'requirements.*.matching_mode.required'     => 'Mode matching wajib dipilih.',
            'rewards.*.reward_quantity.required'        => 'Qty reward wajib diisi.',
            'rewards.*.reward_quantity.min'             => 'Qty reward minimal 1.',
            'rewards.*.pools.*.label.required'          => 'Label pada pool item wajib diisi.',
        ];
    }

    /**
     * Prepare data before validation.
     * Normalisasi tipe boolean dari string dan trim whitespace pada code.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'code'           => strtoupper(trim($this->code ?? '')),
            'is_game_reward' => $this->boolean('is_game_reward'),
            'is_combinable'  => $this->boolean('is_combinable'),
            'is_active'      => $this->boolean('is_active'),
            // Normalisasi nilai kosong ke null agar nullable validation bekerja
            'start_time'     => $this->start_time ?: null,
            'end_time'       => $this->end_time ?: null,
            'start_date'     => $this->start_date ?: null,
            'end_date'       => $this->end_date ?: null,
        ]);
    }
}
