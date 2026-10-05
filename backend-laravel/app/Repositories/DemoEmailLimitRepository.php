<?php

namespace App\Repositories;

use App\Contracts\DemoEmailLimitRepositoryInterface;
use App\Models\EmailCampaign;
use App\Models\TenantEmailUsage;
use Illuminate\Support\Facades\DB;

class DemoEmailLimitRepository implements DemoEmailLimitRepositoryInterface
{
    public function ensureUsageExists(string $tenantId): void
    {
        $now = now();

        DB::table('tenant_email_usages')->upsert(
            [[
                'tenant_id' => $tenantId,
                'sent_count' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]],
            ['tenant_id'],
            ['updated_at']
        );
    }

    public function lockedSentCount(string $tenantId): int
    {
        return TenantEmailUsage::query()
            ->whereKey($tenantId)
            ->lockForUpdate()
            ->firstOrFail()
            ->sent_count;
    }

    public function campaignRecipientCount(string $tenantId): int
    {
        return (int) EmailCampaign::query()
            ->where('tenant_id', $tenantId)
            ->sum('recipient_count');
    }

    public function saveSentCount(string $tenantId, int $sentCount): void
    {
        TenantEmailUsage::query()
            ->whereKey($tenantId)
            ->update(['sent_count' => $sentCount]);
    }
}
