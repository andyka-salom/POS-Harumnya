<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SalesTarget extends Model
{
    use HasUuids;

    protected $fillable = ['sales_person_id', 'year', 'month', 'target_amount', 'target_quantity'];

    public function salesPerson() {
        return $this->belongsTo(SalesPerson::class);
    }
}
