<?php

namespace App\Contracts;

use App\Models\EmailCampaign;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface EmailCampaignRepositoryInterface
{
    public function all(string $tenantId): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator;

    public function find(string $campaignId): ?EmailCampaign;

    /**
     * @param  array<string, mixed>  $data
     */
    public function createQueued(string $tenantId, array $data): EmailCampaign;

    public function updateStatus(EmailCampaign $campaign, string $status): EmailCampaign;
}
