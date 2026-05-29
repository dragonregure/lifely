<?php

namespace App\Observers;

use App\Models\Listing;
use App\Support\Activity\ModelActivityRecorder;

class ListingActivityObserver
{
    public function __construct(private readonly ModelActivityRecorder $activity)
    {
    }

    public function created(Listing $listing): void
    {
        $this->activity->created(
            $listing,
            'listing',
            null,
            'listing.created',
            "Created listing {$listing->title}."
        );
    }

    public function updated(Listing $listing): void
    {
        $changes = $this->activity->changes($listing);

        if ($changes === []) {
            return;
        }

        $this->activity->updated(
            $listing,
            'listing',
            null,
            'listing.updated',
            "Updated listing {$listing->title}: ".implode(', ', array_keys($changes)).'.'
        );
    }

    public function deleted(Listing $listing): void
    {
        $this->activity->deleted(
            $listing,
            'listing',
            null,
            'listing.deleted',
            "Deleted listing {$listing->title}."
        );
    }
}
