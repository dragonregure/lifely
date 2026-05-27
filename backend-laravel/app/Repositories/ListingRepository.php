<?php

namespace App\Repositories;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\ListingRepositoryInterface;
use App\Models\Listing;
use Illuminate\Support\Collection;

class ListingRepository implements ListingRepositoryInterface
{
    public function __construct(private readonly ActivityRepositoryInterface $activity)
    {
    }

    public function all(string $tenantId): Collection
    {
        return Listing::query()
            ->where('tenant_id', $tenantId)
            ->latest()
            ->get();
    }

    public function create(string $tenantId, array $data): Listing
    {
        $listing = Listing::query()->create($data + ['tenant_id' => $tenantId]);
        $this->activity->record($tenantId, null, 'listing.created', "Created listing {$listing->title}.");

        return $listing;
    }
}
