<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountRequirement extends Model
{
    use HasUuids;

    protected $table = 'discount_requirements';

    protected $fillable = [
        'discount_type_id',
        'variant_id',
        'intensity_id',
        'size_id',
        'required_quantity',
        'matching_mode',
        'group_key',
    ];

    protected $casts = [
        // unsignedSmallInteger
        'required_quantity' => 'integer',
        // enum('all','any') — string by default, no cast needed
        // group_key: string|null — no cast needed
    ];

    public function discountType(): BelongsTo
    {
        return $this->belongsTo(DiscountType::class, 'discount_type_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(Variant::class, 'variant_id');
    }

    public function intensity(): BelongsTo
    {
        return $this->belongsTo(Intensity::class, 'intensity_id');
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class, 'size_id');
    }
}
