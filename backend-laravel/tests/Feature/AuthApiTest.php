<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_sanctum_tokens(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'tenant_name' => 'Northstar Realty',
            'name' => 'Avery Stone',
            'email' => 'avery@example.com',
            'password' => 'Password12345',
            'password_confirmation' => 'Password12345',
            'device_name' => 'test-suite',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonStructure([
                'data' => [
                    'access_token',
                    'access_expires_at',
                    'refresh_token',
                    'refresh_expires_at',
                    'user' => ['id', 'tenant_id', 'role', 'name', 'email'],
                ],
            ]);

        $this->assertDatabaseHas('users', ['email' => 'avery@example.com']);
        $this->assertSame(2, PersonalAccessToken::query()->count());
    }

    public function test_user_can_login_refresh_and_logout(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'maya@example.com',
            'password' => Hash::make('password'),
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'maya@example.com',
            'password' => 'password',
            'device_name' => 'test-suite',
        ])->assertOk();

        $refreshToken = $login->json('data.refresh_token');

        $refresh = $this->postJson('/api/v1/auth/refresh', [
            'refresh_token' => $refreshToken,
            'device_name' => 'test-suite',
        ])->assertOk();

        $this->assertNotSame($refreshToken, $refresh->json('data.refresh_token'));

        Sanctum::actingAs($user, ['access']);

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.user.email', 'maya@example.com');

        $this->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logged out.');
    }
}
