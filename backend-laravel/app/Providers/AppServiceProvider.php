<?php

namespace App\Providers;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\ContactRepositoryInterface;
use App\Contracts\EmailCampaignRepositoryInterface;
use App\Contracts\ListingRepositoryInterface;
use App\Contracts\PipelineRepositoryInterface;
use App\Contracts\ReportingServiceInterface;
use App\Contracts\TenantRepositoryInterface;
use App\Repositories\ActivityRepository;
use App\Repositories\ContactRepository;
use App\Repositories\EmailCampaignRepository;
use App\Repositories\ListingRepository;
use App\Repositories\PipelineRepository;
use App\Repositories\TenantRepository;
use App\Services\ReportingService;
use Illuminate\Support\ServiceProvider;

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
        $this->app->bind(ReportingServiceInterface::class, ReportingService::class);
        $this->app->bind(TenantRepositoryInterface::class, TenantRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
