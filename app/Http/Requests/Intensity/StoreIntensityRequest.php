<?php

namespace App\Http\Requests\Intensity;

use Illuminate\Foundation\Http\FormRequest;

class StoreIntensityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code'          => 'required|string|max:10|unique:intensities,code',
            'name'          => 'required|string|max:100',
            // Format string ratio: "1 : 2", "1 : 1", "2 : 1", "1 : 4"
            'oil_ratio'     => ['required', 'string', 'max:10', 'regex:/^\d+(\.\d+)?\s*:\s*\d+(\.\d+)?$/'],
            'alcohol_ratio' => ['required', 'string', 'max:10', 'regex:/^\d+(\.\d+)?\s*:\s*\d+(\.\d+)?$/'],
            'sort_order'    => 'required|integer|min:0',
            'is_active'     => 'required|boolean',
        ];
    }

    /**
     * Validasi tambahan: alcohol_ratio harus merupakan kebalikan dari oil_ratio.
     * Contoh: oil="1:2" → alcohol harus "2:1"
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $oil     = $this->input('oil_ratio', '');
            $alcohol = $this->input('alcohol_ratio', '');

            if (!$oil || !$alcohol) return;

            [$oO, $oA] = $this->parseParts($oil);
            [$aO, $aA] = $this->parseParts($alcohol);

            // Alcohol ratio harus merupakan kebalikan: alcohol = alkohol:minyak
            // Toleransi kecil untuk pembulatan
            if (abs($oO - $aA) > 0.01 || abs($oA - $aO) > 0.01) {
                $validator->errors()->add(
                    'alcohol_ratio',
                    "Ratio alkohol harus kebalikan dari ratio bibit (oil={$oil} → alcohol harus {$oA}:{$oO})"
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'code.required'          => 'Kode intensitas wajib diisi.',
            'code.unique'            => 'Kode intensitas sudah digunakan.',
            'code.max'               => 'Kode maksimal 10 karakter.',
            'name.required'          => 'Nama intensitas wajib diisi.',
            'name.max'               => 'Nama maksimal 100 karakter.',
            'oil_ratio.required'     => 'Ratio bibit wajib diisi.',
            'oil_ratio.regex'        => 'Format ratio bibit tidak valid (contoh: 1:2, 2:1).',
            'oil_ratio.max'          => 'Ratio bibit maksimal 10 karakter.',
            'alcohol_ratio.required' => 'Ratio alkohol wajib diisi.',
            'alcohol_ratio.regex'    => 'Format ratio alkohol tidak valid (contoh: 2:1, 1:1).',
            'alcohol_ratio.max'      => 'Ratio alkohol maksimal 10 karakter.',
            'sort_order.required'    => 'Urutan tampilan wajib diisi.',
            'sort_order.min'         => 'Urutan minimal 0.',
            'is_active.required'     => 'Status wajib dipilih.',
        ];
    }

    private function parseParts(string $ratio): array
    {
        $parts = preg_split('/\s*:\s*/', trim($ratio));
        return [
            (float) ($parts[0] ?? 0),
            (float) ($parts[1] ?? 0),
        ];
    }
}
