import { Injectable } from '@nestjs/common';
import {
  allPermissions,
  defaultRolePermissions,
  PermissionName,
  Permissions,
  RoleName,
} from './rbac.constants.js';
import { RbacRepository } from './rbac.repository.js';
import { UserAccess } from './rbac.types.js';

@Injectable()
export class RbacService {
  constructor(private readonly rbacRepository: RbacRepository) {}

  async ensureDefaultRoles(): Promise<void> {
    const permissionsByName = new Map<
      PermissionName,
      Awaited<ReturnType<RbacRepository['findOrCreatePermission']>>
    >(
      await Promise.all(
        allPermissions().map(
          async (
            permission,
          ): Promise<
            [
              PermissionName,
              Awaited<ReturnType<RbacRepository['findOrCreatePermission']>>,
            ]
          > => [
            permission,
            await this.rbacRepository.findOrCreatePermission(permission),
          ],
        ),
      ),
    );

    for (const [roleName, permissions] of Object.entries(
      defaultRolePermissions(),
    ) as [RoleName, PermissionName[]][]) {
      const role = await this.rbacRepository.findOrCreateRole(roleName);

      for (const permissionName of permissions) {
        const permission = permissionsByName.get(permissionName);

        if (permission) {
          await this.rbacRepository.assignPermissionToRole(
            role.id,
            permission.id,
          );
        }
      }
    }
  }

  async assignRoleToUser(userId: string, roleName: RoleName): Promise<void> {
    const role = await this.rbacRepository.findOrCreateRole(roleName);
    await this.rbacRepository.assignRoleToUser(userId, role.id);
  }

  async getUserAccess(userId: string): Promise<UserAccess> {
    return this.rbacRepository.getUserAccess(userId);
  }

  permissionNames(access: UserAccess): string[] {
    return [
      ...new Set([...access.directPermissions, ...access.rolePermissions]),
    ];
  }

  can(access: UserAccess, permission: string): boolean {
    const permissions = this.permissionNames(access);
    return (
      permissions.includes(Permissions.SYSTEM_BYPASS) ||
      permissions.includes(permission)
    );
  }

  canAll(access: UserAccess, permissions: string[]): boolean {
    return permissions.every((permission) => this.can(access, permission));
  }
}
