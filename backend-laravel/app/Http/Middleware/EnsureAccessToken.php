<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccessToken
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->tokenCan('access')) {
            return response()->json([
                'message' => 'This endpoint requires an access token.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
