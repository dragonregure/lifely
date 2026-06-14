<?php

namespace App\Providers;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\ContactRepositoryInterface;
use App\Contracts\DocumentRepositoryInterface;
use App\Contracts\EmailCampaignRepositoryInterface;
use App\Contracts\EmailSenderInterface;
use App\Contracts\ExportServiceInterface;
use App\Contracts\ListingRepositoryInterface;
use App\Contracts\LeadRepositoryInterface;
use App\Contracts\ReferenceRepositoryInterface;
use App\Contracts\ReportingServiceInterface;
use App\Contracts\TenantRepositoryInterface;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Models\Listing;
use App\Models\Lead;
use App\Models\Reference;
use App\Models\Role;
use App\Models\User;
use App\Observers\ContactActivityObserver;
use App\Observers\EmailCampaignActivityObserver;
use App\Observers\ListingActivityObserver;
use App\Observers\LeadActivityObserver;
use App\Policies\PermissionPolicy;
use App\Policies\ReferencePolicy;
use App\Policies\RolePolicy;
use App\Policies\UserPolicy;
use App\Repositories\ActivityRepository;
use App\Repositories\ContactRepository;
use App\Repositories\DocumentRepository;
use App\Repositories\EmailCampaignRepository;
use App\Repositories\ListingRepository;
use App\Repositories\LeadRepository;
use App\Repositories\ReferenceRepository;
use App\Repositories\TenantRepository;
use App\Services\Email\DemoEmailLimiter;
use App\Services\Email\DemoLimitedEmailSender;
use App\Services\Email\LaravelMailEmailSender;
use App\Services\Email\ResendApiEmailSender;
use App\Services\ExportService;
use App\Services\ReportingService;
use App\Support\Rbac\Permissions;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;
use Spatie\Permission\Models\Permission;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(ActivityRepositoryInterface::class, ActivityRepository::class);
        $this->app->bind(ContactRepositoryInterface::class, ContactRepository::class);
        $this->app->bind(DocumentRepositoryInterface::class, DocumentRepository::class);
        $this->app->bind(EmailCampaignRepositoryInterface::class, EmailCampaignRepository::class);
        $this->app->bind(EmailSenderInterface::class, function (): EmailSenderInterface {
            $sender = config('lifely_email.sender', 'mail');
            $mailer = config('lifely_email.mailer');

            if (! is_string($sender)) {
                throw new InvalidArgumentException('Unsupported email sender configuration.');
            }

            $configuredSender = match ($sender) {
                'mail' => new LaravelMailEmailSender(is_string($mailer) ? $mailer : null),
                'resend-api' => new ResendApiEmailSender(),
                default => throw new InvalidArgumentException("Unsupported email sender [{$sender}]."),
            };

            if (config('lifely.app_mode') !== 'demo') {
                return $configuredSender;
            }

            return new DemoLimitedEmailSender($configuredSender, $this->app->make(DemoEmailLimiter::class));
        });
        $this->app->bind(ExportServiceInterface::class, ExportService::class);
        $this->app->bind(ListingRepositoryInterface::class, ListingRepository::class);
        $this->app->bind(LeadRepositoryInterface::class, LeadRepository::class);
        $this->app->bind(ReferenceRepositoryInterface::class, ReferenceRepository::class);
        $this->app->bind(ReportingServiceInterface::class, ReportingService::class);
        $this->app->bind(TenantRepositoryInterface::class, TenantRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Contact::observe(ContactActivityObserver::class);
        EmailCampaign::observe(EmailCampaignActivityObserver::class);
        Listing::observe(ListingActivityObserver::class);
        Lead::observe(LeadActivityObserver::class);

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
