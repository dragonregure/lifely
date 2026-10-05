<?php

namespace App\Contracts;

use App\Models\EmailCampaign;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface EmailCampaignServiceInterface
{
    public function all(string $tenantId): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $data
     */
    public function queue(string $tenantId, array $data): EmailCampaign;

    public function processQueuedCampaign(string $campaignId, bool $sendSynchronously = false): void;

    public function sendCampaignContact(string $campaignId, string $contactId): void;
}
