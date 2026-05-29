<?php

namespace App\Providers;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\ContactRepositoryInterface;
use App\Contracts\EmailCampaignRepositoryInterface;
use App\Contracts\ListingRepositoryInterface;
use App\Contracts\PipelineRepositoryInterface;
use App\Contracts\ReferenceRepositoryInterface;
use App\Contracts\ReportingServiceInterface;
use App\Contracts\TenantRepositoryInterface;
use App\Models\Reference;
use App\Models\User;
use App\Policies\PermissionPolicy;
use App\Policies\ReferencePolicy;
use App\Policies\RolePolicy;
use App\Policies\UserPolicy;
use App\Repositories\ActivityRepository;
use App\Repositories\ContactRepository;
use App\Repositories\EmailCampaignRepository;
use App\Repositories\ListingRepository;
use App\Repositories\PipelineRepository;
use App\Repositories\ReferenceRepository;
use App\Repositories\TenantRepository;
use App\Services\ReportingService;
use App\Support\Rbac\Permissions;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(ActivityRepositoryInterface::class, ActivityRepository::class);
        $this->app->bind(ContactRepositoryInterface::class, ContactRepository::class);
        $this->app->bind(EmailCampaignRepositoryInterface::class, EmailCampaignRepository::class);
        $this->app->bind(ListingRepositoryInterface::class, ListingRepository::class);
        $this->app->bind(PipelineRepositoryInterface::class, PipelineRepository::class);
        $this->app->bind(ReferenceRepositoryInterface::class, ReferenceRepository::class);
        $this->app->bind(ReportingServiceInterface::class, ReportingService::class);
        $this->app->bind(TenantRepositoryInterface::class, TenantRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::before(fn (User $user): ?bool => $user->hasSystemBypass() ? true : null);

        Gate::policy(Role::class, RolePolicy::class);
        Gate::policy(Permission::class, PermissionPolicy::class);
        Gate::policy(Reference::class, ReferencePolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        Gate::define('manage-rbac', fn (User $user): bool => $user->can(Permissions::ROLES_VIEW) || $user->can(Permissions::PERMISSIONS_VIEW));
        Gate::define('assign-user-roles', fn (User $user, User $model): bool => $user->can(Permissions::USERS_ASSIGN_ROLES));
        Gate::define('assign-user-permissions', fn (User $user, User $model): bool => $user->can(Permissions::USERS_ASSIGN_PERMISSIONS));
    }
}
