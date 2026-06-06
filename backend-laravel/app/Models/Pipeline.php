<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pipeline extends Model
{
    use HasFactory, HasUuids;

    public const STAGE_NEW_LEAD = 0;
    public const STAGE_CONTACTED = 1;
    public const STAGE_QUALIFIED = 2;
    public const STAGE_VIEWING_SCHEDULED = 3;
    public const STAGE_VIEWED = 4;
    public const STAGE_NEGOTIATING = 5;
    public const STAGE_CLOSED_WON = 6;
    public const STAGE_CLOSED_LOST = 7;
    public const STAGE_DORMANT = 8;

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

    public const STAGE_LABELS = [
        self::STAGE_NEW_LEAD => 'New Lead',
        self::STAGE_CONTACTED => 'Contacted',
        self::STAGE_QUALIFIED => 'Qualified',
        self::STAGE_VIEWING_SCHEDULED => 'Viewing Scheduled',
        self::STAGE_VIEWED => 'Viewed',
        self::STAGE_NEGOTIATING => 'Negotiating',
        self::STAGE_CLOSED_WON => 'Closed Won',
        self::STAGE_CLOSED_LOST => 'Closed Lost',
        self::STAGE_DORMANT => 'Dormant',
    ];

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
    ];

    /**
     * @var array<string, int>
     */
    private const LEGACY_STAGE_LABELS = [
        'new lead' => self::STAGE_NEW_LEAD,
        'viewing' => self::STAGE_VIEWING_SCHEDULED,
        'viewing: scheduled' => self::STAGE_VIEWING_SCHEDULED,
        'offer' => self::STAGE_NEGOTIATING,
        'closing' => self::STAGE_CLOSED_WON,
        'closed' => self::STAGE_CLOSED_WON,
        'closed: won' => self::STAGE_CLOSED_WON,
        'closed: lost' => self::STAGE_CLOSED_LOST,
    ];

    protected $table = 'pipelines';

    protected $fillable = [
        'tenant_id',
        'contact_id',
        'listing_id',
        'user_id',
        'stage',
        'source',
        'is_active',
        'next_task',
        'due_at',
    ];

    protected function casts(): array
    {
        return [
            'stage' => 'integer',
            'source' => 'integer',
            'is_active' => 'boolean',
            'due_at' => 'datetime',
        ];
    }

    /**
     * @return array<int, int>
     */
    public static function stageValues(): array
    {
        return array_keys(self::STAGE_LABELS);
    }

    public static function stageLabel(int $stage): string
    {
        return self::STAGE_LABELS[$stage] ?? self::STAGE_LABELS[self::STAGE_NEW_LEAD];
    }

    /**
     * @return array<int, int>
     */
    public static function closedStageValues(): array
    {
        return [
            self::STAGE_CLOSED_WON,
            self::STAGE_CLOSED_LOST,
        ];
    }

    public static function isClosedStageValue(int $stage): bool
    {
        return in_array($stage, self::closedStageValues(), true);
    }

    public function isClosedStage(): bool
    {
        return self::isClosedStageValue((int) $this->stage);
    }

    public function hasBlockingProblem(): bool
    {
        $listing = $this->relationLoaded('listing') ? $this->getRelation('listing') : $this->listing;
        $contact = $this->relationLoaded('contact') ? $this->getRelation('contact') : $this->contact;

        return ($listing instanceof Listing && (int) $listing->status === Listing::STATUS_SOLD)
            || ($contact instanceof Contact && ! (bool) $contact->status);
    }

    /**
     * @return array<int, int>
     */
    public static function sourceValues(): array
    {
        return array_keys(self::SOURCE_LABELS);
    }

    public static function sourceLabel(int $source): string
    {
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

    public static function stageFromInput(mixed $stage): ?int
    {
        if (is_int($stage)) {
            return in_array($stage, self::stageValues(), true) ? $stage : null;
        }

        if (! is_string($stage)) {
            return null;
        }

        $normalized = strtolower(trim(preg_replace('/\s+/', ' ', $stage) ?? $stage));

        if ($normalized === '') {
            return null;
        }

        if (is_numeric($normalized)) {
            $stageValue = (int) $normalized;

            return in_array($stageValue, self::stageValues(), true) ? $stageValue : null;
        }

        foreach (self::STAGE_LABELS as $value => $label) {
            if (strtolower($label) === $normalized) {
                return $value;
            }
        }

        return self::LEGACY_STAGE_LABELS[$normalized] ?? null;
    }

    public function value(): float
    {
        if ($this->relationLoaded('listing')) {
            $listing = $this->getRelation('listing');

            return $listing instanceof Listing ? (float) $listing->price : 0.0;
        }

        return (float) ($this->listing()->value('price') ?? 0);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
