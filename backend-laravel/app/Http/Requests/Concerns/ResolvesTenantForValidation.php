<?php

namespace App\Http\Requests\Concerns;

use App\Support\TenantResolver;

trait ResolvesTenantForValidation
{
    protected function tenantIdForValidation(): ?string
    {
        return app(TenantResolver::class)->resolve($this);
    }
}
