<?php

namespace App\Support;

use Illuminate\Http\Request;

class TenantResolver
{
    public function resolve(Request $request): ?string
    {
        $tenantId = $request->header('X-Tenant-Id')
            ?? $request->query('tenant_id')
            ?? $request->input('tenant_id')
            ?? $request->user()?->tenant_id;

        if (! is_string($tenantId) || trim($tenantId) === '') {
            return null;
        }

        return trim($tenantId);
    }
}
