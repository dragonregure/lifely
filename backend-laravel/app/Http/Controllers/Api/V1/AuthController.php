<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\LogoutRequest;
use App\Http\Requests\Auth\RefreshTokenRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Resources\AuthUserResource;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $payload = DB::transaction(function () use ($request): array {
            $tenant = Tenant::query()->create([
                'name' => $request->validated('tenant_name'),
            ]);

            $user = User::query()->create([
                'tenant_id' => $tenant->id,
                'role' => 'Office Admin',
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
                'password' => Hash::make($request->validated('password')),
            ])->load('tenant');

            return $this->tokenPayload($user, $request->validated('device_name', 'api'));
        });

        return response()->json(['data' => $payload], Response::HTTP_CREATED);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()
            ->where('email', $request->validated('email'))
            ->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], Response::HTTP_UNAUTHORIZED);
        }

        if (Hash::needsRehash($user->password)) {
            $user->forceFill(['password' => Hash::make($request->validated('password'))])->save();
        }

        return response()->json([
            'data' => $this->tokenPayload($user->load('tenant'), $request->validated('device_name', 'api')),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'user' => new AuthUserResource($request->user()->load('tenant')),
            ],
        ]);
    }

    public function refresh(RefreshTokenRequest $request): JsonResponse
    {
        $token = PersonalAccessToken::findToken($request->validated('refresh_token'));

        if (! $token || ! $token->can('refresh') || $this->isExpired($token)) {
            return response()->json(['message' => 'Invalid refresh token.'], Response::HTTP_UNAUTHORIZED);
        }

        $user = $token->tokenable;

        if (! $user instanceof User) {
            return response()->json(['message' => 'Invalid refresh token.'], Response::HTTP_UNAUTHORIZED);
        }

        $token->delete();

        return response()->json([
            'data' => $this->tokenPayload($user->load('tenant'), $request->validated('device_name', 'api')),
        ]);
    }

    public function logout(LogoutRequest $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        if ($request->filled('refresh_token')) {
            $refreshToken = PersonalAccessToken::findToken($request->validated('refresh_token'));

            if ($refreshToken?->tokenable?->is($request->user())) {
                $refreshToken->delete();
            }
        }

        return response()->json(['message' => 'Logged out.']);
    }

    public function revokeAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'All tokens revoked.']);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        if (! Hash::check($request->validated('current_password'), $request->user()->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $request->user()->forceFill([
            'password' => Hash::make($request->validated('password')),
        ])->save();

        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Password updated. Sign in again with the new password.']);
    }

    private function tokenPayload(User $user, string $deviceName): array
    {
        $accessToken = $user->createToken(
            "{$deviceName}:access",
            ['access'],
            now()->addMinutes(config('lifely_auth.access_token_minutes'))
        );

        $refreshToken = $user->createToken(
            "{$deviceName}:refresh",
            ['refresh'],
            now()->addDays(config('lifely_auth.refresh_token_days'))
        );

        return [
            'token_type' => 'Bearer',
            'access_token' => $accessToken->plainTextToken,
            'access_expires_at' => $accessToken->accessToken->expires_at?->toISOString(),
            'refresh_token' => $refreshToken->plainTextToken,
            'refresh_expires_at' => $refreshToken->accessToken->expires_at?->toISOString(),
            'user' => new AuthUserResource($user),
        ];
    }

    private function isExpired(PersonalAccessToken $token): bool
    {
        return $token->expires_at !== null && $token->expires_at->isPast();
    }
}
