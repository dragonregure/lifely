<?php

namespace App\Services\Email;

use App\Contracts\DemoEmailLimitRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DemoEmailLimiter
{
    public const TENANT_HEADER = 'X-Lifely-Tenant-Id';

    public const RESERVED_HEADER = 'X-Lifely-Email-Limit-Reserved';

    public function __construct(private readonly DemoEmailLimitRepositoryInterface $limits)
    {
    }

    public function reserve(string $tenantId, int $requestedCount): void
    {
        if (! $this->enabled() || $requestedCount <= 0) {
            return;
        }

        DB::transaction(function () use ($tenantId, $requestedCount): void {
            $this->limits->ensureUsageExists($tenantId);

            $usedCount = max(
                $this->limits->lockedSentCount($tenantId),
                $this->limits->campaignRecipientCount($tenantId)
            );
            $remainingCount = max(0, $this->limit() - $usedCount);

            if ($requestedCount > $remainingCount) {
                throw ValidationException::withMessages([
                    'email_limit' => [$this->message($remainingCount)],
                ]);
            }

            $this->limits->saveSentCount($tenantId, $usedCount + $requestedCount);
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

    private function message(int $remainingCount): string
    {
        return "Email sending in demo limited to {$this->limit()} times, you have {$remainingCount} limit left.";
    }
}
