<?php

namespace App\Observers;

use App\Models\Contact;
use App\Support\Activity\ModelActivityRecorder;

class ContactActivityObserver
{
    public function __construct(private readonly ModelActivityRecorder $activity)
    {
    }

    public function created(Contact $contact): void
    {
        $this->activity->created(
            $contact,
            'contact',
            $contact->owner_id,
            'contact.created',
            "Created contact {$contact->first_name} {$contact->last_name}."
        );
    }

    public function updated(Contact $contact): void
    {
        $changes = $this->activity->changes($contact);

        if ($changes === []) {
            return;
        }

        $this->activity->updated(
            $contact,
            'contact',
            $contact->owner_id,
            'contact.updated',
            "Updated contact {$contact->first_name} {$contact->last_name}: ".implode(', ', array_keys($changes)).'.'
        );
    }

    public function deleted(Contact $contact): void
    {
        $this->activity->deleted(
            $contact,
            'contact',
            $contact->owner_id,
            'contact.deleted',
            "Deleted contact {$contact->first_name} {$contact->last_name}."
        );
    }
}
