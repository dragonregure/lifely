<?php

namespace App\Services\Email;

use App\Models\EmailCampaign;
use App\Models\TenantEmailUsage;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DemoEmailLimiter
{
    public const TENANT_HEADER = 'X-Lifely-Tenant-Id';

    public const RESERVED_HEADER = 'X-Lifely-Email-Limit-Reserved';

    public function reserve(string $tenantId, int $requestedCount): void
    {
        if (! $this->enabled() || $requestedCount <= 0) {
            return;
        }

        DB::transaction(function () use ($tenantId, $requestedCount): void {
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

            $usage = TenantEmailUsage::query()
                ->whereKey($tenantId)
                ->lockForUpdate()
                ->firstOrFail();

            $usedCount = max($usage->sent_count, $this->campaignRecipientCount($tenantId));
            $remainingCount = max(0, $this->limit() - $usedCount);

            if ($requestedCount > $remainingCount) {
                throw ValidationException::withMessages([
                    'email_limit' => [$this->message($remainingCount)],
                ]);
            }

            $usage->update(['sent_count' => $usedCount + $requestedCount]);
        });
    }

    public function enabled(): bool
    {
        return config('lifely.app_mode') === 'demo';
    }

    public function limit(): int
    {
        return max(0, (int) config('lifely.demo_email_limit', 3));
    }

    private function campaignRecipientCount(string $tenantId): int
    {
        return (int) EmailCampaign::query()
            ->where('tenant_id', $tenantId)
            ->sum('recipient_count');
    }

    private function message(int $remainingCount): string
    {
        return "Email sending in demo limited to {$this->limit()} times, you have {$remainingCount} limit left.";
    }
}
