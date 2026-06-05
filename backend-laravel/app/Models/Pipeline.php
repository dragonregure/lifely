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
        'is_active',
        'next_task',
        'due_at',
    ];

    protected function casts(): array
    {
        return [
            'stage' => 'integer',
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
