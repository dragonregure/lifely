<?php

namespace App\Support\Rbac;

use Illuminate\Support\Arr;

final class Roles
{
    public const SYSTEM_ADMIN = 'System Admin';
    public const OFFICE_ADMIN = 'Office Admin';
    public const MASTER = 'Master';
    public const SALES = 'Sales';
    public const PROPERTY_MANAGER = 'Property Manager';
    public const SENIOR_AGENT = 'Senior Agent';
    public const SIMPLE_AGENT = 'Simple Agent';
    public const MARKETING_COORDINATOR = 'Marketing Coordinator';
    public const TRANSACTION_COORDINATOR = 'Transaction Coordinator';

    /**
     * @return array<string, array<int, string>>
     */
    public static function defaults(): array
    {
        return [
            self::SYSTEM_ADMIN => Permissions::all(),
            self::OFFICE_ADMIN => Permissions::tenantAdmin(),
            self::MASTER => Permissions::tenantAdmin(),
            self::SALES => [
                Permissions::CONTACTS_VIEW,
                Permissions::CONTACTS_CREATE,
                Permissions::CONTACTS_UPDATE,
                Permissions::LISTINGS_VIEW,
                Permissions::PIPELINE_VIEW,
                Permissions::PIPELINE_CREATE,
                Permissions::PIPELINE_UPDATE,
                Permissions::PIPELINE_CHANGE_ASSIGNEE,
                Permissions::PIPELINE_ASSIGN_TO_SELF,
                Permissions::EMAIL_CAMPAIGNS_VIEW,
                Permissions::EMAIL_CAMPAIGNS_CREATE,
                Permissions::ACTIVITY_LOGS_VIEW,
                Permissions::REPORTS_VIEW,
                Permissions::TENANT_VIEW,
                Permissions::REFERENCES_VIEW,
            ],
            self::PROPERTY_MANAGER => [
                Permissions::CONTACTS_VIEW,
                Permissions::LISTINGS_VIEW,
                Permissions::LISTINGS_CREATE,
                Permissions::LISTINGS_UPDATE,
                Permissions::PIPELINE_VIEW,
                Permissions::ACTIVITY_LOGS_VIEW,
                Permissions::REPORTS_VIEW,
                Permissions::TENANT_VIEW,
                Permissions::REFERENCES_VIEW,
            ],
            self::SENIOR_AGENT => [
                Permissions::CONTACTS_VIEW,
                Permissions::CONTACTS_CREATE,
                Permissions::CONTACTS_UPDATE,
                Permissions::LISTINGS_VIEW,
                Permissions::PIPELINE_VIEW,
                Permissions::PIPELINE_CREATE,
                Permissions::PIPELINE_UPDATE,
                Permissions::PIPELINE_ASSIGN_TO_SELF,
                Permissions::ACTIVITY_LOGS_VIEW,
                Permissions::REPORTS_VIEW,
                Permissions::TENANT_VIEW,
                Permissions::REFERENCES_VIEW,
            ],
            self::SIMPLE_AGENT => [
                Permissions::CONTACTS_VIEW,
                Permissions::LISTINGS_VIEW,
                Permissions::PIPELINE_VIEW,
                Permissions::ACTIVITY_LOGS_VIEW,
                Permissions::TENANT_VIEW,
                Permissions::REFERENCES_VIEW,
            ],
            self::MARKETING_COORDINATOR => [
                Permissions::CONTACTS_VIEW,
                Permissions::EMAIL_CAMPAIGNS_VIEW,
                Permissions::EMAIL_CAMPAIGNS_CREATE,
                Permissions::ACTIVITY_LOGS_VIEW,
                Permissions::REPORTS_VIEW,
                Permissions::TENANT_VIEW,
                Permissions::REFERENCES_VIEW,
            ],
            self::TRANSACTION_COORDINATOR => [
                Permissions::CONTACTS_VIEW,
                Permissions::LISTINGS_VIEW,
                Permissions::PIPELINE_VIEW,
                Permissions::PIPELINE_UPDATE,
                Permissions::PIPELINE_ASSIGN_TO_SELF,
                Permissions::ACTIVITY_LOGS_VIEW,
                Permissions::REPORTS_VIEW,
                Permissions::TENANT_VIEW,
                Permissions::REFERENCES_VIEW,
            ],
        ];
    }

    public static function protectedAdmin(): string
    {
        return self::OFFICE_ADMIN;
    }

    public static function randomRole(): string
    {
        $roles = (new \ReflectionClass(static::class))->getConstants();
        return Arr::random($roles);
    }
}
