<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class ListingUser extends Pivot
{
    public $incrementing = false;

    public $timestamps = false;

    protected $table = 'listing_users';

    protected $fillable = [
        'listing_id',
        'user_id',
        'is_primary_owner',
    ];

    protected function casts(): array
    {
        return [
            'is_primary_owner' => 'boolean',
        ];
    }
}
