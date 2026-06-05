<?php

namespace App\Support\Rbac;

final class Permissions
{
    public const SYSTEM_BYPASS = 'system.bypass';

    public const ROLES_VIEW = 'roles.view';
    public const ROLES_CREATE = 'roles.create';
    public const ROLES_UPDATE = 'roles.update';
    public const ROLES_DELETE = 'roles.delete';
    public const ROLES_MANAGE_SYSTEM = 'roles.manage_system';

    public const PERMISSIONS_VIEW = 'permissions.view';
    public const PERMISSIONS_CREATE = 'permissions.create';
    public const PERMISSIONS_UPDATE = 'permissions.update';
    public const PERMISSIONS_DELETE = 'permissions.delete';

    public const USERS_VIEW = 'users.view';
    public const USERS_ASSIGN_ROLES = 'users.assign_roles';
    public const USERS_ASSIGN_PERMISSIONS = 'users.assign_permissions';

    public const CONTACTS_VIEW = 'contacts.view';
    public const CONTACTS_CREATE = 'contacts.create';
    public const CONTACTS_UPDATE = 'contacts.update';
    public const CONTACTS_DELETE = 'contacts.delete';

    public const LISTINGS_VIEW = 'listings.view';
    public const LISTINGS_CREATE = 'listings.create';
    public const LISTINGS_UPDATE = 'listings.update';

    public const PIPELINE_VIEW = 'pipeline.view';
    public const PIPELINE_CREATE = 'pipeline.create';
    public const PIPELINE_UPDATE = 'pipeline.update';
    public const PIPELINE_CHANGE_ASSIGNEE = 'pipeline.change_assignee';
    public const PIPELINE_ASSIGN_TO_SELF = 'pipeline.assign_to_self';

    public const EMAIL_CAMPAIGNS_VIEW = 'email_campaigns.view';
    public const EMAIL_CAMPAIGNS_CREATE = 'email_campaigns.create';

    public const ACTIVITY_LOGS_VIEW = 'activity_logs.view';
    public const REPORTS_VIEW = 'reports.view';
    public const TENANT_VIEW = 'tenant.view';

    public const REFERENCES_VIEW = 'references.view';
    public const REFERENCES_CREATE = 'references.create';
    public const REFERENCES_UPDATE = 'references.update';
    public const REFERENCES_DELETE = 'references.delete';
    public const REFERENCES_MANAGE_SYSTEM = 'references.manage_system';

    /**
     * @return array<int, string>
     */
    public static function all(): array
    {
        return [
            self::SYSTEM_BYPASS,
            self::ROLES_VIEW,
            self::ROLES_CREATE,
            self::ROLES_UPDATE,
            self::ROLES_DELETE,
            self::ROLES_MANAGE_SYSTEM,
            self::PERMISSIONS_VIEW,
            self::PERMISSIONS_CREATE,
            self::PERMISSIONS_UPDATE,
            self::PERMISSIONS_DELETE,
            self::USERS_VIEW,
            self::USERS_ASSIGN_ROLES,
            self::USERS_ASSIGN_PERMISSIONS,
            self::CONTACTS_VIEW,
            self::CONTACTS_CREATE,
            self::CONTACTS_UPDATE,
            self::CONTACTS_DELETE,
            self::LISTINGS_VIEW,
            self::LISTINGS_CREATE,
            self::LISTINGS_UPDATE,
            self::PIPELINE_VIEW,
            self::PIPELINE_CREATE,
            self::PIPELINE_UPDATE,
            self::PIPELINE_CHANGE_ASSIGNEE,
            self::PIPELINE_ASSIGN_TO_SELF,
            self::EMAIL_CAMPAIGNS_VIEW,
            self::EMAIL_CAMPAIGNS_CREATE,
            self::ACTIVITY_LOGS_VIEW,
            self::REPORTS_VIEW,
            self::TENANT_VIEW,
            self::REFERENCES_VIEW,
            self::REFERENCES_CREATE,
            self::REFERENCES_UPDATE,
            self::REFERENCES_DELETE,
            self::REFERENCES_MANAGE_SYSTEM,
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function systemOnly(): array
    {
        return [
            self::SYSTEM_BYPASS,
            self::ROLES_MANAGE_SYSTEM,
            self::PERMISSIONS_CREATE,
            self::PERMISSIONS_UPDATE,
            self::PERMISSIONS_DELETE,
            self::REFERENCES_MANAGE_SYSTEM,
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function tenantAdmin(): array
    {
        return array_values(array_diff(self::all(), self::systemOnly()));
    }

    /**
     * @return array<int, string>
     */
    public static function protected(): array
    {
        return [
            self::ROLES_VIEW,
            self::ROLES_CREATE,
            self::ROLES_UPDATE,
            self::ROLES_DELETE,
            self::ROLES_MANAGE_SYSTEM,
            self::PERMISSIONS_VIEW,
            self::PERMISSIONS_CREATE,
            self::PERMISSIONS_UPDATE,
            self::PERMISSIONS_DELETE,
            self::USERS_VIEW,
            self::USERS_ASSIGN_ROLES,
            self::USERS_ASSIGN_PERMISSIONS,
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function tenantAdminProtected(): array
    {
        return array_values(array_diff(self::protected(), [
            self::ROLES_MANAGE_SYSTEM,
            self::PERMISSIONS_CREATE,
            self::PERMISSIONS_UPDATE,
            self::PERMISSIONS_DELETE,
        ]));
    }
}
