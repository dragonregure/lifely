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

    public function queue(string $tenantId, array $data): EmailCampaign;
}
