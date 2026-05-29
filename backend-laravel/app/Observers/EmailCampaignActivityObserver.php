<?php

namespace App\Observers;

use App\Models\EmailCampaign;
use App\Support\Activity\ModelActivityRecorder;

class EmailCampaignActivityObserver
{
    public function __construct(private readonly ModelActivityRecorder $activity)
    {
    }

    public function created(EmailCampaign $campaign): void
    {
        $this->activity->created(
            $campaign,
            'email_campaign',
            $campaign->user_id,
            'email.queued',
            "Queued bulk email '{$campaign->subject}' to {$campaign->recipient_count} contacts."
        );
    }

    public function updated(EmailCampaign $campaign): void
    {
        $changes = $this->activity->changes($campaign);

        if ($changes === []) {
            return;
        }

        $this->activity->updated(
            $campaign,
            'email_campaign',
            $campaign->user_id,
            'email.updated',
            "Updated bulk email '{$campaign->subject}': ".implode(', ', array_keys($changes)).'.'
        );
    }

    public function deleted(EmailCampaign $campaign): void
    {
        $this->activity->deleted(
            $campaign,
            'email_campaign',
            $campaign->user_id,
            'email.deleted',
            "Deleted bulk email '{$campaign->subject}'."
        );
    }
}
