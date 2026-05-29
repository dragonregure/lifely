<?php

use App\Http\Controllers\Api\V1\ActivityLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ContactController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EmailCampaignController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\ListingController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\PipelineController;
use App\Http\Controllers\Api\V1\ReferenceController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\TenantController;
use App\Http\Controllers\Api\V1\UserAccessController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('health', HealthController::class);

    Route::prefix('auth')->group(function (): void {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
        Route::post('refresh', [AuthController::class, 'refresh']);

        Route::middleware(['auth:sanctum', 'access.token'])->group(function (): void {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
            Route::post('revoke-all', [AuthController::class, 'revokeAll']);
            Route::put('password', [AuthController::class, 'updatePassword']);
        });
    });

    Route::middleware(['auth:sanctum', 'access.token'])->group(function (): void {
        Route::get('tenant', [TenantController::class, 'show']);
        Route::get('members', [TenantController::class, 'members']);
        Route::get('me/permissions', [UserAccessController::class, 'mePermissions']);
        Route::apiResource('roles', RoleController::class);
        Route::apiResource('permissions', PermissionController::class);
        Route::put('users/{user}/roles', [UserAccessController::class, 'syncRoles']);
        Route::put('users/{user}/permissions', [UserAccessController::class, 'syncPermissions']);
        Route::get('dashboard', DashboardController::class);
        Route::apiResource('contacts', ContactController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::apiResource('listings', ListingController::class)->only(['index', 'store']);
        Route::get('pipeline', [PipelineController::class, 'index']);
        Route::post('pipeline', [PipelineController::class, 'store']);
        Route::patch('pipeline/{pipeline}/stage', [PipelineController::class, 'updateStage']);
        Route::get('references/types', [ReferenceController::class, 'referenceTypes']);
        Route::get('references/groups', [ReferenceController::class, 'groups']);
        Route::apiResource('references', ReferenceController::class);
        Route::get('activity-logs', [ActivityLogController::class, 'index']);
        Route::get('email-campaigns', [EmailCampaignController::class, 'index']);
        Route::post('bulk-emails', [EmailCampaignController::class, 'store']);
    });
});
