<?php

namespace App\Repositories;

use App\Contracts\AuthRepositoryInterface;
use App\Models\Tenant;
use App\Models\User;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\PersonalAccessToken;

class AuthRepository implements AuthRepositoryInterface
{
    public function createTenant(string $name): Tenant
    {
        return Tenant::query()->create(['name' => $name]);
    }

    public function createUser(array $attributes): User
    {
        return User::query()->create($attributes);
    }

    public function findUserByEmail(string $email): ?User
    {
        return User::query()
            ->where('email', $email)
            ->first();
    }

    public function savePassword(User $user, string $hashedPassword): void
    {
        $user->forceFill(['password' => $hashedPassword])->save();
    }

    public function findToken(string $plainTextToken): ?PersonalAccessToken
    {
        return PersonalAccessToken::findToken($plainTextToken);
    }

    public function deleteToken(PersonalAccessToken $token): void
    {
        $token->delete();
    }

    public function deleteCurrentAccessToken(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    public function deleteAllTokens(User $user): void
    {
        $user->tokens()->delete();
    }

    public function createToken(User $user, string $name, array $abilities, mixed $expiresAt): NewAccessToken
    {
        return $user->createToken($name, $abilities, $expiresAt);
    }
}
