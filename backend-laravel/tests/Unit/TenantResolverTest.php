<?php

namespace Tests\Unit;

use App\Support\TenantResolver;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class TenantResolverTest extends TestCase
{
    public function test_it_resolves_tenant_from_header_first(): void
    {
        $request = Request::create('/api/v1/contacts?tenant_id=query-tenant', 'GET');
        $request->headers->set('X-Tenant-Id', 'header-tenant');

        $this->assertSame('header-tenant', (new TenantResolver())->resolve($request));
    }

    public function test_it_returns_null_when_tenant_context_is_missing(): void
    {
        $request = Request::create('/api/v1/contacts', 'GET');

        $this->assertNull((new TenantResolver())->resolve($request));
    }
}
