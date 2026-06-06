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

    public const SOURCE_MANUAL_ENTRY = 0;
    public const SOURCE_WEBSITE = 1;
    public const SOURCE_LISTING_INQUIRY = 2;
    public const SOURCE_SOCIAL_MEDIA = 3;
    public const SOURCE_REFERRAL = 4;
    public const SOURCE_PHONE_CALL = 5;
    public const SOURCE_MESSAGING = 6;
    public const SOURCE_EMAIL = 7;
    public const SOURCE_PAID_ADS = 8;
    public const SOURCE_PORTAL = 9;
    public const SOURCE_EXHIBITION = 10;
    public const SOURCE_INTEGRATION = 11;
    public const SOURCE_WALK_IN = 12;
    public const SOURCE_OPEN_HOUSE = 13;
    public const SOURCE_DEVELOPER_PARTNER = 14;
    public const SOURCE_BULK_IMPORT = 15;

    public const SOURCE_LABELS = [
        self::SOURCE_MANUAL_ENTRY => 'Manual Entry',
        self::SOURCE_WEBSITE => 'Website',
        self::SOURCE_LISTING_INQUIRY => 'Listing Inquiry',
        self::SOURCE_SOCIAL_MEDIA => 'Social Media',
        self::SOURCE_REFERRAL => 'Referral',
        self::SOURCE_PHONE_CALL => 'Phone Call',
        self::SOURCE_MESSAGING => 'Messaging',
        self::SOURCE_EMAIL => 'Email',
        self::SOURCE_PAID_ADS => 'Paid Ads',
        self::SOURCE_PORTAL => 'Portal',
        self::SOURCE_EXHIBITION => 'Exhibition',
        self::SOURCE_INTEGRATION => 'Integration',
        self::SOURCE_WALK_IN => 'Walk-in',
        self::SOURCE_OPEN_HOUSE => 'Open House',
        self::SOURCE_DEVELOPER_PARTNER => 'Developer Partner',
        self::SOURCE_BULK_IMPORT => 'Bulk Import',
    ];

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
            'status' => 'boolean',
            'budget' => 'decimal:2',
            'source' => 'integer',
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

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function listings(): BelongsToMany
    {
        return $this->belongsToMany(Listing::class, 'listing_contacts')
            ->using(ListingContact::class);
    }

    /**
     * @return array<int, int>
     */
    public static function sourceValues(): array
    {
        return array_keys(self::SOURCE_LABELS);
    }

    public static function sourceLabel(?int $source): ?string
    {
        if ($source === null) {
            return null;
        }

        return self::SOURCE_LABELS[$source] ?? self::SOURCE_LABELS[self::SOURCE_MANUAL_ENTRY];
    }

    public static function sourceFromInput(mixed $source): ?int
    {
        if (is_int($source)) {
            return in_array($source, self::sourceValues(), true) ? $source : null;
        }

        if (! is_string($source)) {
            return null;
        }

        $normalized = strtolower(trim(preg_replace('/\s+/', ' ', $source) ?? $source));

        if ($normalized === '') {
            return null;
        }

        if (is_numeric($normalized)) {
            $sourceValue = (int) $normalized;

            return in_array($sourceValue, self::sourceValues(), true) ? $sourceValue : null;
        }

        foreach (self::SOURCE_LABELS as $value => $label) {
            if (strtolower($label) === $normalized) {
                return $value;
            }
        }

        return null;
    }
}
