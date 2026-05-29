<?php

namespace App\Support\Activity;

use App\Contracts\ActivityRepositoryInterface;
use App\Models\ActivityLog;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

class ModelActivityRecorder
{
    private const IGNORED_CHANGE_KEYS = [
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    public function __construct(private readonly ActivityRepositoryInterface $activity)
    {
    }

    public function created(Model $model, string $subjectType, ?string $userId, string $actionType, string $description): ActivityLog
    {
        return $this->activity->record(
            (string) $model->getAttribute('tenant_id'),
            $userId,
            $actionType,
            $description,
            $this->properties($model, $subjectType, [
                'attributes' => $this->attributes($model),
            ])
        );
    }

    public function updated(Model $model, string $subjectType, ?string $userId, string $actionType, string $description): ?ActivityLog
    {
        $changes = $this->changes($model);

        if ($changes === []) {
            return null;
        }

        return $this->activity->record(
            (string) $model->getAttribute('tenant_id'),
            $userId,
            $actionType,
            $description,
            $this->properties($model, $subjectType, [
                'changes' => $changes,
            ])
        );
    }

    public function deleted(Model $model, string $subjectType, ?string $userId, string $actionType, string $description): ActivityLog
    {
        return $this->activity->record(
            (string) $model->getAttribute('tenant_id'),
            $userId,
            $actionType,
            $description,
            $this->properties($model, $subjectType, [
                'attributes' => $this->attributes($model),
            ])
        );
    }

    /**
     * @return array<string, array{old: mixed, new: mixed}>
     */
    public function changes(Model $model): array
    {
        $changes = [];

        foreach ($model->getChanges() as $key => $value) {
            if (in_array($key, self::IGNORED_CHANGE_KEYS, true)) {
                continue;
            }

            $changes[$key] = [
                'old' => $this->normalizeValue($model->getOriginal($key)),
                'new' => $this->normalizeValue($value),
            ];
        }

        return $changes;
    }

    /**
     * @return array<string, mixed>
     */
    private function properties(Model $model, string $subjectType, array $extra): array
    {
        return [
            'subject_type' => $subjectType,
            'subject_id' => (string) $model->getKey(),
        ] + $extra;
    }

    /**
     * @return array<string, mixed>
     */
    private function attributes(Model $model): array
    {
        return collect($model->getAttributes())
            ->except(self::IGNORED_CHANGE_KEYS)
            ->map(fn (mixed $value): mixed => $this->normalizeValue($value))
            ->all();
    }

    private function normalizeValue(mixed $value): mixed
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format(DateTimeInterface::ATOM);
        }

        return $value;
    }
}
