<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\LogoutRequest;
use App\Http\Requests\Auth\RefreshTokenRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Resources\AuthUserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->tokenResponse($this->auth->register($request->validated()))], Response::HTTP_CREATED);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $payload = $this->auth->login(
            $request->validated('email'),
            $request->validated('password'),
            $request->validated('device_name', 'api')
        );

        if ($payload === null) {
            return response()->json(['message' => 'Invalid credentials.'], Response::HTTP_UNAUTHORIZED);
        }

        return response()->json([
            'data' => $this->tokenResponse($payload),
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
        $payload = $this->auth->refresh(
            $request->validated('refresh_token'),
            $request->validated('device_name', 'api')
        );

        if ($payload === null) {
            return response()->json(['message' => 'Invalid refresh token.'], Response::HTTP_UNAUTHORIZED);
        }

        return response()->json(['data' => $this->tokenResponse($payload)]);
    }

    public function logout(LogoutRequest $request): JsonResponse
    {
        $this->auth->logout($request->user(), $request->validated('refresh_token'));

        return response()->json(['message' => 'Logged out.']);
    }

    public function revokeAll(Request $request): JsonResponse
    {
        $this->auth->revokeAll($request->user());

        return response()->json(['message' => 'All tokens revoked.']);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $updated = $this->auth->updatePassword(
            $request->user(),
            $request->validated('current_password'),
            $request->validated('password')
        );

        if (! $updated) {
            return response()->json(['message' => 'Current password is incorrect.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json(['message' => 'Password updated. Sign in again with the new password.']);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function tokenResponse(array $payload): array
    {
        $user = $payload['user'];

        return [
            'token_type' => 'Bearer',
            'access_token' => $payload['access_token'],
            'access_expires_at' => $payload['access_expires_at'],
            'refresh_token' => $payload['refresh_token'],
            'refresh_expires_at' => $payload['refresh_expires_at'],
            'user' => new AuthUserResource($user),
        ];
    }
}
