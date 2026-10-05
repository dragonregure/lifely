<?php

namespace App\Services;

use App\Contracts\AuthRepositoryInterface;
use App\Contracts\AuthServiceInterface;
use App\Contracts\RbacServiceInterface;
use App\Models\User;
use App\Support\Rbac\Roles;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\PersonalAccessToken;

class AuthService implements AuthServiceInterface
{
    public function __construct(
        private readonly AuthRepositoryInterface $auth,
        private readonly RbacServiceInterface $rbac,
    ) {
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function register(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            $tenant = $this->auth->createTenant($data['tenant_name']);

            $user = $this->auth->createUser([
                'tenant_id' => $tenant->id,
                'role' => Roles::OFFICE_ADMIN,
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ])->load('tenant');

            $this->rbac->ensureRoleExists(Roles::OFFICE_ADMIN);
            $this->rbac->syncUserRoles($tenant->id, $user, [Roles::OFFICE_ADMIN]);

            return $this->tokenPayload($user, (string) ($data['device_name'] ?? 'api'));
        });
    }

    /**
     * @return array<string, mixed>|null
     */
    public function login(string $email, string $password, string $deviceName): ?array
    {
        $user = $this->auth->findUserByEmail($email);

        if (! $user || ! Hash::check($password, $user->password)) {
            return null;
        }

        if (Hash::needsRehash($user->password)) {
            $this->auth->savePassword($user, Hash::make($password));
        }

        return $this->tokenPayload($user->load('tenant'), $deviceName);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function refresh(string $refreshToken, string $deviceName): ?array
    {
        $token = $this->auth->findToken($refreshToken);

        if (! $token || ! $token->can('refresh') || $this->isExpired($token)) {
            return null;
        }

        $user = $token->tokenable;

        if (! $user instanceof User) {
            return null;
        }

        $this->auth->deleteToken($token);

        return $this->tokenPayload($user->load('tenant'), $deviceName);
    }

    public function logout(User $user, ?string $refreshToken): void
    {
        $this->auth->deleteCurrentAccessToken($user);

        if ($refreshToken === null) {
            return;
        }

        $token = $this->auth->findToken($refreshToken);

        if ($token?->tokenable?->is($user)) {
            $this->auth->deleteToken($token);
        }
    }

    public function revokeAll(User $user): void
    {
        $this->auth->deleteAllTokens($user);
    }

    public function updatePassword(User $user, string $currentPassword, string $password): bool
    {
        if (! Hash::check($currentPassword, $user->password)) {
            return false;
        }

        $this->auth->savePassword($user, Hash::make($password));

        $this->revokeAll($user);

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    private function tokenPayload(User $user, string $deviceName): array
    {
        $accessToken = $this->auth->createToken(
            $user,
            "{$deviceName}:access",
            ['access'],
            now()->addMinutes(config('lifely_auth.access_token_minutes'))
        );

        $refreshToken = $this->auth->createToken(
            $user,
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
