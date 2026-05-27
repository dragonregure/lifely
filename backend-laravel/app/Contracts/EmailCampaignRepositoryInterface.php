<?php

namespace App\Contracts;

use App\Models\EmailCampaign;
use Illuminate\Support\Collection;

interface EmailCampaignRepositoryInterface
{
    public function all(string $tenantId): Collection;

    public function queue(string $tenantId, array $data): EmailCampaign;
}
