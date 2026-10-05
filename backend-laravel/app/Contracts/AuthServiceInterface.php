<?php

namespace App\Contracts;

use App\Models\User;

interface AuthServiceInterface
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function register(array $data): array;

    /**
     * @return array<string, mixed>|null
     */
    public function login(string $email, string $password, string $deviceName): ?array;

    /**
     * @return array<string, mixed>|null
     */
    public function refresh(string $refreshToken, string $deviceName): ?array;

    public function logout(User $user, ?string $refreshToken): void;

    public function revokeAll(User $user): void;

    public function updatePassword(User $user, string $currentPassword, string $password): bool;
}
