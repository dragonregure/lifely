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

    public function test_refresh_rotates_tokens_and_rejects_reuse(): void
    {
        Tenant::factory()->create();
        User::factory()->create([
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
        $this->assertNull(PersonalAccessToken::findToken($refreshToken));

        $this->postJson('/api/v1/auth/refresh', [
            'refresh_token' => $refreshToken,
            'device_name' => 'test-suite',
        ])->assertUnauthorized();
    }

    public function test_refresh_rejects_access_tokens(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-suite:access', ['access'], now()->addMinutes(15));

        $this->postJson('/api/v1/auth/refresh', [
            'refresh_token' => $token->plainTextToken,
            'device_name' => 'test-suite',
        ])->assertUnauthorized();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }

    public function test_logout_revokes_current_access_token_and_supplied_refresh_token(): void
    {
        $user = User::factory()->create();
        $accessToken = $user->createToken('test-suite:access', ['access'], now()->addMinutes(15));
        $refreshToken = $user->createToken('test-suite:refresh', ['refresh'], now()->addDays(30));

        $this->withHeader('Authorization', 'Bearer '.$accessToken->plainTextToken)
            ->postJson('/api/v1/auth/logout', [
                'refresh_token' => $refreshToken->plainTextToken,
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Logged out.');

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $accessToken->accessToken->id,
        ]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $refreshToken->accessToken->id,
        ]);
    }

    public function test_revoke_all_revokes_only_the_authenticated_users_tokens(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $accessToken = $user->createToken('test-suite:access', ['access'], now()->addMinutes(15));
        $user->createToken('test-suite:refresh', ['refresh'], now()->addDays(30));
        $otherToken = $otherUser->createToken('test-suite:access', ['access'], now()->addMinutes(15));

        $this->withHeader('Authorization', 'Bearer '.$accessToken->plainTextToken)
            ->postJson('/api/v1/auth/revoke-all')
            ->assertOk()
            ->assertJsonPath('message', 'All tokens revoked.');

        $this->assertSame(0, $user->tokens()->count());
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $otherToken->accessToken->id,
        ]);
    }

    public function test_password_update_changes_password_and_revokes_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'maya@example.com',
            'password' => Hash::make('OldPassword12345'),
        ]);
        $accessToken = $user->createToken('test-suite:access', ['access'], now()->addMinutes(15));
        $user->createToken('test-suite:refresh', ['refresh'], now()->addDays(30));

        $this->withHeader('Authorization', 'Bearer '.$accessToken->plainTextToken)
            ->putJson('/api/v1/auth/password', [
                'current_password' => 'OldPassword12345',
                'password' => 'NewPassword12345',
                'password_confirmation' => 'NewPassword12345',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Password updated. Sign in again with the new password.');

        $this->assertTrue(Hash::check('NewPassword12345', $user->refresh()->password));
        $this->assertSame(0, $user->tokens()->count());

        $this->postJson('/api/v1/auth/login', [
            'email' => 'maya@example.com',
            'password' => 'OldPassword12345',
        ])->assertUnauthorized();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'maya@example.com',
            'password' => 'NewPassword12345',
        ])->assertOk();
    }

    public function test_password_update_rejects_incorrect_current_password_without_revoking_tokens(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword12345'),
        ]);
        $accessToken = $user->createToken('test-suite:access', ['access'], now()->addMinutes(15));
        $user->createToken('test-suite:refresh', ['refresh'], now()->addDays(30));

        $this->withHeader('Authorization', 'Bearer '.$accessToken->plainTextToken)
            ->putJson('/api/v1/auth/password', [
                'current_password' => 'WrongPassword12345',
                'password' => 'NewPassword12345',
                'password_confirmation' => 'NewPassword12345',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Current password is incorrect.');

        $this->assertTrue(Hash::check('OldPassword12345', $user->refresh()->password));
        $this->assertSame(2, $user->tokens()->count());
    }
}
