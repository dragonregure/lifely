<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contact extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'owner_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'status',
        'budget',
        'source',
        'last_contacted_at',
    ];

    protected function casts(): array
    {
        return [
            'budget' => 'decimal:2',
            'last_contacted_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function pipelineDeals(): HasMany
    {
        return $this->hasMany(PipelineDeal::class);
    }

    public function listings(): BelongsToMany
    {
        return $this->belongsToMany(Listing::class, 'listing_contacts')
            ->using(ListingContact::class);
    }
}
