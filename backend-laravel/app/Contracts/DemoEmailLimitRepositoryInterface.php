<?php

namespace App\Contracts;

interface DemoEmailLimitRepositoryInterface
{
    public function ensureUsageExists(string $tenantId): void;

    public function lockedSentCount(string $tenantId): int;

    public function campaignRecipientCount(string $tenantId): int;

    public function saveSentCount(string $tenantId, int $sentCount): void;
}
