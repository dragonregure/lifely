<?php

namespace App\Contracts;

use App\Models\Tenant;
use App\Models\User;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\PersonalAccessToken;

interface AuthRepositoryInterface
{
    public function createTenant(string $name): Tenant;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createUser(array $attributes): User;

    public function findUserByEmail(string $email): ?User;

    public function savePassword(User $user, string $hashedPassword): void;

    public function findToken(string $plainTextToken): ?PersonalAccessToken;

    public function deleteToken(PersonalAccessToken $token): void;

    public function deleteCurrentAccessToken(User $user): void;

    public function deleteAllTokens(User $user): void;

    /**
     * @param  array<int, string>  $abilities
     */
    public function createToken(User $user, string $name, array $abilities, mixed $expiresAt): NewAccessToken;
}
