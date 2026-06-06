<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Listing extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_AVAILABLE = 1;
    public const STATUS_RESERVED = 2;
    public const STATUS_UNDER_CONTRACT = 3;
    public const STATUS_SOLD = 4;

    public const TYPE_HOUSE = 1;
    public const TYPE_CONDO = 2;
    public const TYPE_TOWNHOME = 3;
    public const TYPE_APARTMENT = 4;
    public const TYPE_STUDIO = 5;
    public const TYPE_VILLA = 6;
    public const TYPE_DUPLEX = 7;
    public const TYPE_MULTI_FAMILY = 8;
    public const TYPE_LAND = 9;
    public const TYPE_FARM = 10;
    public const TYPE_OFFICE = 11;
    public const TYPE_RETAIL = 12;
    public const TYPE_WAREHOUSE = 13;
    public const TYPE_COMMERCIAL = 14;
    public const TYPE_INDUSTRIAL = 15;
    public const TYPE_MIXED_USE = 16;

    protected $fillable = [
        'tenant_id',
        'title',
        'address',
        'price',
        'status',
        'bedrooms',
        'bathrooms',
        'property_type',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'status' => 'integer',
            'property_type' => 'integer',
        ];
    }

    public static function statusValues(): array
    {
        return [
            self::STATUS_AVAILABLE,
            self::STATUS_RESERVED,
            self::STATUS_UNDER_CONTRACT,
            self::STATUS_SOLD,
        ];
    }

    public static function propertyTypeValues(): array
    {
        return [
            self::TYPE_HOUSE,
            self::TYPE_CONDO,
            self::TYPE_TOWNHOME,
            self::TYPE_APARTMENT,
            self::TYPE_STUDIO,
            self::TYPE_VILLA,
            self::TYPE_DUPLEX,
            self::TYPE_MULTI_FAMILY,
            self::TYPE_LAND,
            self::TYPE_FARM,
            self::TYPE_OFFICE,
            self::TYPE_RETAIL,
            self::TYPE_WAREHOUSE,
            self::TYPE_COMMERCIAL,
            self::TYPE_INDUSTRIAL,
            self::TYPE_MIXED_USE,
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function contacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'listing_contacts')
            ->using(ListingContact::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'listing_users')
            ->using(ListingUser::class)
            ->withPivot('is_primary_owner');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'model_id')
            ->where('model', 'listing')
            ->orderBy('order');
    }
}
