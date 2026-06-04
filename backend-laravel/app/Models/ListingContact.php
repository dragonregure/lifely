<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class ListingContact extends Pivot
{
    public $incrementing = false;

    public $timestamps = false;

    protected $table = 'listing_contacts';

    protected $fillable = [
        'listing_id',
        'contact_id',
    ];
}
