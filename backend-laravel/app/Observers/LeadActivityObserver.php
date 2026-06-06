<?php

namespace App\Observers;

use App\Models\Lead;
use App\Support\Activity\ModelActivityRecorder;

class LeadActivityObserver
{
    public function __construct(private readonly ModelActivityRecorder $activity)
    {
    }

    public function created(Lead $lead): void
    {
        $this->activity->created(
            $lead,
            'lead',
            $lead->user_id,
            'lead.created',
            'Created a lead and follow-up task.'
        );
    }

    public function updated(Lead $lead): void
    {
        $changes = $this->activity->changes($lead);

        if ($changes === []) {
            return;
        }

        $description = array_key_exists('stage', $changes)
            ? 'Moved lead to '.Lead::stageLabel((int) $lead->stage).'.'
            : 'Updated lead: '.implode(', ', array_keys($changes)).'.';

        $this->activity->updated($lead, 'lead', $lead->user_id, 'lead.updated', $description);
    }

    public function deleted(Lead $lead): void
    {
        $this->activity->deleted(
            $lead,
            'lead',
            $lead->user_id,
            'lead.deleted',
            'Deleted lead.'
        );
    }
}
