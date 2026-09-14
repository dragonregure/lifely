import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  allPermissions,
  defaultRolePermissions,
  DEFAULT_GUARD_NAME,
  PermissionName,
  Permissions,
  protectedPermissions,
  RoleName,
  Roles,
  systemOnlyPermissions,
  tenantAdminProtectedPermissions,
} from './rbac.constants.js';
import {
  PermissionRecord,
  RbacRepository,
  RoleRecord,
} from './rbac.repository.js';
import {
  PermissionResponseDto,
  RoleResponseDto,
  StorePermissionDto,
  StoreRoleDto,
  UpdatePermissionDto,
  UpdateRoleDto,
} from './rbac.dto.js';
import { AuthenticatedUser, UserAccess } from './rbac.types.js';

type RoleInclude = 'permissions';
type PermissionInclude = 'roles';

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

  canManageSystemRoles(user: AuthenticatedUser): boolean {
    return (
      user.permissions.includes(Permissions.SYSTEM_BYPASS) ||
      user.permissions.includes(Permissions.ROLES_MANAGE_SYSTEM)
    );
  }

  async listRoles(
    tenantId: string,
    canManageSystem: boolean,
    includes: RoleInclude[] = [],
  ): Promise<RoleResponseDto[]> {
    const roles = await this.visibleRoles(tenantId, canManageSystem);

    return Promise.all(
      roles.map((role) => this.toRoleResponse(role, canManageSystem, includes)),
    );
  }

  async createRole(
    tenantId: string,
    canManageSystem: boolean,
    dto: StoreRoleDto,
  ): Promise<RoleResponseDto> {
    const guardName = dto.guard_name ?? DEFAULT_GUARD_NAME;
    const roleTenantId = this.tenantIdFromPayload(
      tenantId,
      canManageSystem,
      dto.tenant_id,
      tenantId,
      'Only users with roles.manage_system can create system roles.',
    );

    await this.ensureUniqueRole(roleTenantId, dto.name, guardName);
    const permissions = await this.permissionsFromNames(
      dto.permissions ?? [],
      guardName,
      canManageSystem,
    );

    const role = await this.rbacRepository.createRole({
      tenantId: roleTenantId,
      name: dto.name,
      guardName,
    });

    await this.syncRolePermissions(role, permissions);

    return this.toRoleResponse(role, canManageSystem, []);
  }

  async findRole(
    tenantId: string,
    roleId: string,
    canManageSystem: boolean,
    includes: RoleInclude[] = [],
  ): Promise<RoleResponseDto> {
    const role = await this.findVisibleRoleRecord(
      tenantId,
      roleId,
      canManageSystem,
    );

    return this.toRoleResponse(role, canManageSystem, includes);
  }

  async updateRole(
    tenantId: string,
    roleId: string,
    canManageSystem: boolean,
    dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.findVisibleRoleRecord(
      tenantId,
      roleId,
      canManageSystem,
    );

    this.ensureCanMutateRole(role, canManageSystem);

    if (
      role.name === Roles.OFFICE_ADMIN &&
      dto.name !== undefined &&
      dto.name !== role.name
    ) {
      throw new UnprocessableEntityException(
        'The Office Admin role name cannot be changed.',
      );
    }

    const nextTenantId =
      dto.tenant_id === undefined
        ? role.tenantId
        : this.tenantIdFromPayload(
            tenantId,
            canManageSystem,
            dto.tenant_id,
            role.tenantId,
            'Only users with roles.manage_system can promote roles to system scope.',
          );
    const nextName = dto.name ?? role.name;
    const nextGuardName = dto.guard_name ?? role.guardName;

    await this.ensureUniqueRole(nextTenantId, nextName, nextGuardName, role.id);

    await this.rbacRepository.updateRole(role.id, {
      tenantId: nextTenantId,
      name: nextName,
      guardName: nextGuardName,
      updatedAt: new Date().toISOString(),
    });

    const updated = await this.rbacRepository.findRoleById(role.id);

    if (!updated) {
      throw new NotFoundException('Role not found.');
    }

    if (dto.permissions !== undefined) {
      const permissions = await this.permissionsFromNames(
        dto.permissions,
        nextGuardName,
        canManageSystem,
      );
      await this.syncRolePermissions(updated, permissions);
    }

    return this.toRoleResponse(updated, canManageSystem, []);
  }

  async deleteRole(
    tenantId: string,
    roleId: string,
    canManageSystem: boolean,
  ): Promise<void> {
    const role = await this.findVisibleRoleRecord(
      tenantId,
      roleId,
      canManageSystem,
    );

    this.ensureCanMutateRole(role, canManageSystem);

    if (role.name === Roles.OFFICE_ADMIN) {
      throw new UnprocessableEntityException(
        'The Office Admin role cannot be deleted.',
      );
    }

    await this.rbacRepository.deleteRole(role.id);
  }

  async listPermissions(
    canManageSystem: boolean,
    includes: PermissionInclude[] = [],
  ): Promise<PermissionResponseDto[]> {
    const permissions = await this.visiblePermissions(canManageSystem);

    return Promise.all(
      permissions.map((permission) =>
        this.toPermissionResponse(permission, canManageSystem, includes),
      ),
    );
  }

  async createPermission(
    dto: StorePermissionDto,
  ): Promise<PermissionResponseDto> {
    const guardName = dto.guard_name ?? DEFAULT_GUARD_NAME;

    await this.ensureUniquePermission(dto.name, guardName);

    return this.toPermissionResponse(
      await this.rbacRepository.createPermission({
        name: dto.name,
        guardName,
      }),
      true,
      [],
    );
  }

  async findPermission(
    permissionId: string,
    canManageSystem: boolean,
    includes: PermissionInclude[] = [],
  ): Promise<PermissionResponseDto> {
    const permission = await this.findVisiblePermissionRecord(
      permissionId,
      canManageSystem,
    );

    return this.toPermissionResponse(permission, canManageSystem, includes);
  }

  async updatePermission(
    permissionId: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permission = await this.findPermissionRecord(permissionId);

    if (
      protectedPermissions().includes(permission.name as PermissionName) &&
      dto.name !== undefined &&
      dto.name !== permission.name
    ) {
      throw new UnprocessableEntityException(
        'Protected administrative permissions cannot be renamed.',
      );
    }

    const nextName = dto.name ?? permission.name;
    const nextGuardName = dto.guard_name ?? permission.guardName;

    await this.ensureUniquePermission(nextName, nextGuardName, permission.id);
    await this.rbacRepository.updatePermission(permission.id, {
      name: nextName,
      guardName: nextGuardName,
      updatedAt: new Date().toISOString(),
    });

    const updated = await this.rbacRepository.findPermissionById(permission.id);

    if (!updated) {
      throw new NotFoundException('Permission not found.');
    }

    return this.toPermissionResponse(updated, true, []);
  }

  async deletePermission(permissionId: string): Promise<void> {
    const permission = await this.findPermissionRecord(permissionId);

    if (protectedPermissions().includes(permission.name as PermissionName)) {
      throw new UnprocessableEntityException(
        'Protected administrative permissions cannot be deleted.',
      );
    }

    if (
      await this.rbacRepository.permissionAssignedToRoleName(
        permission.id,
        Roles.OFFICE_ADMIN,
      )
    ) {
      throw new UnprocessableEntityException(
        'Permissions assigned to Office Admin cannot be deleted.',
      );
    }

    await this.rbacRepository.deletePermission(permission.id);
  }

  private async visibleRoles(
    tenantId: string,
    canManageSystem: boolean,
  ): Promise<RoleRecord[]> {
    const roles = (await this.rbacRepository.allRoles()).filter(
      (role) => role.tenantId === null || role.tenantId === tenantId,
    );
    const visible: RoleRecord[] = [];

    for (const role of roles) {
      if (canManageSystem || !(await this.roleHasSystemOnlyPermissions(role))) {
        visible.push(role);
      }
    }

    return visible.sort((left, right) =>
      `${left.tenantId ?? ''}:${left.name}`.localeCompare(
        `${right.tenantId ?? ''}:${right.name}`,
      ),
    );
  }

  private async visiblePermissions(
    canManageSystem: boolean,
  ): Promise<PermissionRecord[]> {
    const systemOnly = new Set(systemOnlyPermissions());

    return (await this.rbacRepository.allPermissions())
      .filter(
        (permission) =>
          canManageSystem || !systemOnly.has(permission.name as PermissionName),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private async findVisibleRoleRecord(
    tenantId: string,
    roleId: string,
    canManageSystem: boolean,
  ): Promise<RoleRecord> {
    const role = await this.rbacRepository.findRoleById(
      this.idFromParam(roleId),
    );

    if (
      !role ||
      (role.tenantId !== null && role.tenantId !== tenantId) ||
      (!canManageSystem && (await this.roleHasSystemOnlyPermissions(role)))
    ) {
      throw new NotFoundException('Role not found.');
    }

    return role;
  }

  private async findPermissionRecord(
    permissionId: string,
  ): Promise<PermissionRecord> {
    const permission = await this.rbacRepository.findPermissionById(
      this.idFromParam(permissionId),
    );

    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }

    return permission;
  }

  private async findVisiblePermissionRecord(
    permissionId: string,
    canManageSystem: boolean,
  ): Promise<PermissionRecord> {
    const permission = await this.findPermissionRecord(permissionId);

    if (
      !canManageSystem &&
      systemOnlyPermissions().includes(permission.name as PermissionName)
    ) {
      throw new NotFoundException('Permission not found.');
    }

    return permission;
  }

  private ensureCanMutateRole(
    role: RoleRecord,
    canManageSystem: boolean,
  ): void {
    if (role.tenantId === null && !canManageSystem) {
      throw new ForbiddenException('System roles require roles.manage_system.');
    }
  }

  private tenantIdFromPayload(
    currentTenantId: string,
    canManageSystem: boolean,
    requestedTenantId: string | null | undefined,
    defaultTenantId: string | null,
    systemScopeMessage: string,
  ): string | null {
    const tenantId =
      requestedTenantId === undefined ? defaultTenantId : requestedTenantId;

    if (tenantId === null && !canManageSystem) {
      throw new UnprocessableEntityException(systemScopeMessage);
    }

    if (tenantId !== null && tenantId !== currentTenantId) {
      throw new ForbiddenException(
        'Role tenant does not match the current tenant context.',
      );
    }

    return tenantId;
  }

  private async ensureUniqueRole(
    tenantId: string | null,
    name: string,
    guardName: string,
    ignoreId?: number,
  ): Promise<void> {
    const conflict = (await this.rbacRepository.allRoles()).some((role) => {
      if (ignoreId !== undefined && role.id === ignoreId) {
        return false;
      }

      if (role.name !== name || role.guardName !== guardName) {
        return false;
      }

      return tenantId === null
        ? true
        : role.tenantId === null || role.tenantId === tenantId;
    });

    if (conflict) {
      throw new UnprocessableEntityException({
        message: 'Validation failed.',
        errors: {
          name: ['A role with this name already exists for this role scope.'],
        },
      });
    }
  }

  private async ensureUniquePermission(
    name: string,
    guardName: string,
    ignoreId?: number,
  ): Promise<void> {
    const permission = await this.rbacRepository.findPermissionByName(
      name,
      guardName,
    );

    if (permission && permission.id !== ignoreId) {
      throw new UnprocessableEntityException({
        message: 'Validation failed.',
        errors: {
          name: ['The name has already been taken.'],
        },
      });
    }
  }

  private async permissionsFromNames(
    names: string[],
    guardName: string,
    canManageSystem: boolean,
  ): Promise<PermissionRecord[]> {
    const uniqueNames = [...new Set(names)];
    const permissions = await this.rbacRepository.allPermissions();
    const byName = new Map(
      permissions
        .filter((permission) => permission.guardName === guardName)
        .map((permission) => [permission.name, permission]),
    );
    const missing = uniqueNames.filter((name) => !byName.has(name));

    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Validation failed.',
        errors: {
          permissions: ['One or more selected permissions are invalid.'],
        },
      });
    }

    const blocked = uniqueNames.filter((name) =>
      systemOnlyPermissions().includes(name as PermissionName),
    );

    if (!canManageSystem && blocked.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Validation failed.',
        errors: {
          permissions: ['System permissions require roles.manage_system.'],
        },
      });
    }

    return uniqueNames.map((name) => byName.get(name)!);
  }

  private async syncRolePermissions(
    role: RoleRecord,
    permissions: PermissionRecord[],
  ): Promise<void> {
    const permissionSet = new Map(
      permissions.map((permission) => [permission.name, permission]),
    );

    if (role.name === Roles.OFFICE_ADMIN) {
      const allPermissionsByName = new Map(
        (await this.rbacRepository.allPermissions()).map((permission) => [
          permission.name,
          permission,
        ]),
      );

      for (const permissionName of tenantAdminProtectedPermissions()) {
        const permission = allPermissionsByName.get(permissionName);

        if (permission) {
          permissionSet.set(permission.name, permission);
        }
      }
    }

    await this.rbacRepository.syncRolePermissions(role.id, [
      ...permissionSet.values(),
    ]);
  }

  private async roleHasSystemOnlyPermissions(
    role: RoleRecord,
  ): Promise<boolean> {
    const systemOnly = new Set(systemOnlyPermissions());
    const permissions = await this.rbacRepository.permissionsForRole(role.id);

    return permissions.some((permission) =>
      systemOnly.has(permission.name as PermissionName),
    );
  }

  private async toRoleResponse(
    role: RoleRecord,
    canManageSystem: boolean,
    includes: RoleInclude[],
  ): Promise<RoleResponseDto> {
    const response: RoleResponseDto = {
      id: role.id,
      tenant_id: role.tenantId,
      is_system: role.tenantId === null,
      name: role.name,
      guard_name: role.guardName,
      created_at: role.createdAt,
      updated_at: role.updatedAt,
    };

    if (includes.includes('permissions')) {
      const permissions = await this.rbacRepository.permissionsForRole(role.id);
      const visiblePermissions = canManageSystem
        ? permissions
        : permissions.filter(
            (permission) =>
              !systemOnlyPermissions().includes(
                permission.name as PermissionName,
              ),
          );

      response.permissions = visiblePermissions.map((permission) =>
        this.permissionFields(permission),
      );
    }

    return response;
  }

  private async toPermissionResponse(
    permission: PermissionRecord,
    canManageSystem: boolean,
    includes: PermissionInclude[],
  ): Promise<PermissionResponseDto> {
    const response = this.permissionFields(permission);

    if (includes.includes('roles')) {
      const roles = await this.rbacRepository.rolesForPermission(permission.id);
      const visibleRoles = canManageSystem
        ? roles
        : await this.filterSystemOnlyRoles(roles);

      response.roles = visibleRoles.map((role) => this.roleFields(role));
    }

    return response;
  }

  private async filterSystemOnlyRoles(
    roles: RoleRecord[],
  ): Promise<RoleRecord[]> {
    const visible: RoleRecord[] = [];

    for (const role of roles) {
      if (!(await this.roleHasSystemOnlyPermissions(role))) {
        visible.push(role);
      }
    }

    return visible;
  }

  private permissionFields(
    permission: PermissionRecord,
  ): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      guard_name: permission.guardName,
      created_at: permission.createdAt,
      updated_at: permission.updatedAt,
    };
  }

  private roleFields(role: RoleRecord): RoleResponseDto {
    return {
      id: role.id,
      tenant_id: role.tenantId,
      is_system: role.tenantId === null,
      name: role.name,
      guard_name: role.guardName,
      created_at: role.createdAt,
      updated_at: role.updatedAt,
    };
  }

  private idFromParam(value: string): number {
    const id = Number.parseInt(value, 10);

    if (!Number.isInteger(id) || id <= 0 || id.toString() !== value) {
      throw new NotFoundException('Resource not found.');
    }

    return id;
  }
}
