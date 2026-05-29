<?php

namespace App\Observers;

use App\Models\PipelineDeal;
use App\Support\Activity\ModelActivityRecorder;

class PipelineDealActivityObserver
{
    public function __construct(private readonly ModelActivityRecorder $activity)
    {
    }

    public function created(PipelineDeal $deal): void
    {
        $this->activity->created(
            $deal,
            'pipeline',
            $deal->user_id,
            'pipeline.created',
            'Created a pipeline deal and follow-up task.'
        );
    }

    public function updated(PipelineDeal $deal): void
    {
        $changes = $this->activity->changes($deal);

        if ($changes === []) {
            return;
        }

        $description = array_key_exists('stage', $changes)
            ? "Moved pipeline deal to {$deal->stage}."
            : 'Updated pipeline deal: '.implode(', ', array_keys($changes)).'.';

        $this->activity->updated($deal, 'pipeline', $deal->user_id, 'pipeline.updated', $description);
    }

    public function deleted(PipelineDeal $deal): void
    {
        $this->activity->deleted(
            $deal,
            'pipeline',
            $deal->user_id,
            'pipeline.deleted',
            'Deleted pipeline deal.'
        );
    }
}
