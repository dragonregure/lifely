<?php

namespace App\Observers;

use App\Models\Pipeline;
use App\Support\Activity\ModelActivityRecorder;

class PipelineActivityObserver
{
    public function __construct(private readonly ModelActivityRecorder $activity)
    {
    }

    public function created(Pipeline $pipeline): void
    {
        $this->activity->created(
            $pipeline,
            'pipeline',
            $pipeline->user_id,
            'pipeline.created',
            'Created a pipeline and follow-up task.'
        );
    }

    public function updated(Pipeline $pipeline): void
    {
        $changes = $this->activity->changes($pipeline);

        if ($changes === []) {
            return;
        }

        $description = array_key_exists('stage', $changes)
            ? 'Moved pipeline to '.Pipeline::stageLabel((int) $pipeline->stage).'.'
            : 'Updated pipeline: '.implode(', ', array_keys($changes)).'.';

        $this->activity->updated($pipeline, 'pipeline', $pipeline->user_id, 'pipeline.updated', $description);
    }

    public function deleted(Pipeline $pipeline): void
    {
        $this->activity->deleted(
            $pipeline,
            'pipeline',
            $pipeline->user_id,
            'pipeline.deleted',
            'Deleted pipeline.'
        );
    }
}
