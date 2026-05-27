<?php

namespace App\Contracts;

interface ReportingServiceInterface
{
    public function dashboard(string $tenantId): array;
}
