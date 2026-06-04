<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\TenantResolver;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

abstract class BaseApiController extends Controller
{
    protected const ALLOWED_INCLUDES = [];

    protected function tenantId(Request $request): string
    {
        $tenantId = app(TenantResolver::class)->resolve($request);

        if (! $tenantId) {
            throw ValidationException::withMessages([
                'tenant_id' => ['Provide tenant context using the X-Tenant-Id header or tenant_id parameter.'],
            ]);
        }

        if ($request->user() && $request->user()->tenant_id !== $tenantId) {
            throw new HttpException(403, 'Tenant context does not match the authenticated user.');
        }

        return $tenantId;
    }

    protected function includes(Request $request): array
    {
        $requested = $request->query('include', []);
        $values = is_array($requested) ? $requested : [$requested];
        $includes = [];

        foreach ($values as $value) {
            if (! is_string($value)) {
                continue;
            }

            foreach (explode(',', $value) as $relation) {
                $relation = trim($relation);

                if (in_array($relation, static::ALLOWED_INCLUDES, true) && ! in_array($relation, $includes, true)) {
                    $includes[] = $relation;
                }
            }
        }

        return $includes;
    }
}
