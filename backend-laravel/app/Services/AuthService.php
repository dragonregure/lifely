<?php

namespace App\Services;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Roles;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\PersonalAccessToken;

class AuthService
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function register(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            $tenant = Tenant::query()->create([
                'name' => $data['tenant_name'],
            ]);

            $user = User::query()->create([
                'tenant_id' => $tenant->id,
                'role' => Roles::OFFICE_ADMIN,
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ])->load('tenant');

            Role::findOrCreate(Roles::OFFICE_ADMIN, 'web');
            $user->assignRole(Roles::OFFICE_ADMIN);

            return $this->tokenPayload($user, (string) ($data['device_name'] ?? 'api'));
        });
    }

    /**
     * @return array<string, mixed>|null
     */
    public function login(string $email, string $password, string $deviceName): ?array
    {
        $user = User::query()
            ->where('email', $email)
            ->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            return null;
        }

        if (Hash::needsRehash($user->password)) {
            $user->forceFill(['password' => Hash::make($password)])->save();
        }

        return $this->tokenPayload($user->load('tenant'), $deviceName);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function refresh(string $refreshToken, string $deviceName): ?array
    {
        $token = PersonalAccessToken::findToken($refreshToken);

        if (! $token || ! $token->can('refresh') || $this->isExpired($token)) {
            return null;
        }

        $user = $token->tokenable;

        if (! $user instanceof User) {
            return null;
        }

        $token->delete();

        return $this->tokenPayload($user->load('tenant'), $deviceName);
    }

    public function logout(User $user, ?string $refreshToken): void
    {
        $user->currentAccessToken()?->delete();

        if ($refreshToken === null) {
            return;
        }

        $token = PersonalAccessToken::findToken($refreshToken);

        if ($token?->tokenable?->is($user)) {
            $token->delete();
        }
    }

    public function revokeAll(User $user): void
    {
        $user->tokens()->delete();
    }

    public function updatePassword(User $user, string $currentPassword, string $password): bool
    {
        if (! Hash::check($currentPassword, $user->password)) {
            return false;
        }

        $user->forceFill([
            'password' => Hash::make($password),
        ])->save();

        $this->revokeAll($user);

        return true;
    }

    /**
     * @return array<string, mixed>
     */
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
            'access_token' => $accessToken->plainTextToken,
            'access_expires_at' => $this->expiresAt($accessToken),
            'refresh_token' => $refreshToken->plainTextToken,
            'refresh_expires_at' => $this->expiresAt($refreshToken),
            'user' => $user,
        ];
    }

    private function expiresAt(NewAccessToken $token): ?string
    {
        return $token->accessToken->expires_at?->toISOString();
    }

    private function isExpired(PersonalAccessToken $token): bool
    {
        return $token->expires_at !== null && $token->expires_at->isPast();
    }
}
