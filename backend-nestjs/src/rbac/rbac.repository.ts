import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import {
  DEFAULT_GUARD_NAME,
  MODEL_TYPE_USER,
  PermissionName,
  RoleName,
} from './rbac.constants.js';
import { UserAccess } from './rbac.types.js';

type RoleRecord = {
  id: number;
  tenantId: string | null;
  name: string;
  guardName: string;
  createdAt: string;
  updatedAt: string;
};

type PermissionRecord = {
  id: number;
  name: string;
  guardName: string;
  createdAt: string;
  updatedAt: string;
};

type RoleAssignmentWithRole = {
  roleId: number;
  role: {
    name: string;
  };
};

type PermissionGrantWithPermission = {
  permission: {
    id: number;
    name: string;
    guardName: string;
    createdAt: string;
    updatedAt: string;
  };
};

type RoleGrantWithRole = {
  role: RoleRecord;
};

export type { PermissionRecord, RoleRecord };

@Injectable()
export class RbacRepository {
  async findOrCreatePermission(
    name: PermissionName,
  ): Promise<PermissionRecord> {
    const existing = await db.orm.public.Permission.where({
      name,
      guardName: DEFAULT_GUARD_NAME,
    }).first();

    if (existing) {
      return existing;
    }

    return db.orm.public.Permission.create({
      name,
      guardName: DEFAULT_GUARD_NAME,
    });
  }

  async findOrCreateRole(
    name: RoleName,
    tenantId: string | null = null,
  ): Promise<RoleRecord> {
    const query = db.orm.public.Role.where({
      name,
      guardName: DEFAULT_GUARD_NAME,
    });
    const existing =
      tenantId === null
        ? await query.where((role) => role.tenantId.isNull()).first()
        : await query.where({ tenantId }).first();

    if (existing) {
      return existing;
    }

    return db.orm.public.Role.create({
      name,
      tenantId,
      guardName: DEFAULT_GUARD_NAME,
    });
  }

  async assignPermissionToRole(
    roleId: number,
    permissionId: number,
  ): Promise<void> {
    const existing = await db.orm.public.RoleHasPermission.where({
      roleId,
      permissionId,
    }).first();

    if (!existing) {
      await db.orm.public.RoleHasPermission.create({ roleId, permissionId });
    }
  }

  async assignRoleToUser(userId: string, roleId: number): Promise<void> {
    const existing = await db.orm.public.ModelHasRole.where({
      roleId,
      modelId: userId,
      modelType: MODEL_TYPE_USER,
    }).first();

    if (!existing) {
      await db.orm.public.ModelHasRole.create({
        roleId,
        modelId: userId,
        modelType: MODEL_TYPE_USER,
      });
    }
  }

  async getUserAccess(userId: string): Promise<UserAccess> {
    const roleAssignments = (await db.orm.public.ModelHasRole.where({
      modelId: userId,
      modelType: MODEL_TYPE_USER,
    })
      .include('role')
      .all()) as unknown as RoleAssignmentWithRole[];

    const directPermissionGrants =
      (await db.orm.public.ModelHasPermission.where({
        modelId: userId,
        modelType: MODEL_TYPE_USER,
      })
        .include('permission')
        .all()) as unknown as PermissionGrantWithPermission[];

    const rolePermissionNames = await Promise.all(
      roleAssignments.map(async (assignment) => {
        const grants = (await db.orm.public.RoleHasPermission.where({
          roleId: assignment.roleId,
        })
          .include('permission')
          .all()) as unknown as PermissionGrantWithPermission[];

        return grants.map((grant) => grant.permission.name);
      }),
    );

    return {
      roles: roleAssignments.map((assignment) => assignment.role.name),
      directPermissions: directPermissionGrants.map(
        (grant) => grant.permission.name,
      ),
      rolePermissions: rolePermissionNames.flat(),
    };
  }

  async allRoles(): Promise<RoleRecord[]> {
    return await db.orm.public.Role.all();
  }

  async findRoleById(id: number): Promise<RoleRecord | null> {
    return db.orm.public.Role.where({
      id,
    }).first();
  }

  async createRole(data: {
    tenantId: string | null;
    name: string;
    guardName: string;
  }): Promise<RoleRecord> {
    return db.orm.public.Role.create(data);
  }

  async updateRole(
    id: number,
    data: {
      tenantId?: string | null;
      name?: string;
      guardName?: string;
      updatedAt: string;
    },
  ): Promise<void> {
    await db.orm.public.Role.where({ id }).update(data);
  }

  async deleteRole(id: number): Promise<void> {
    await db.orm.public.Role.where({ id }).delete();
  }

  async permissionsForRole(roleId: number): Promise<PermissionRecord[]> {
    const grants = (await db.orm.public.RoleHasPermission.where({ roleId })
      .include('permission')
      .all()) as unknown as PermissionGrantWithPermission[];

    return grants.map((grant) => grant.permission);
  }

  async syncRolePermissions(
    roleId: number,
    permissions: PermissionRecord[],
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.orm.public.RoleHasPermission.where({ roleId }).delete();

      for (const permission of permissions) {
        await tx.orm.public.RoleHasPermission.create({
          roleId,
          permissionId: permission.id,
        });
      }
    });
  }

  async allPermissions(): Promise<PermissionRecord[]> {
    return await db.orm.public.Permission.all();
  }

  async findPermissionById(id: number): Promise<PermissionRecord | null> {
    return db.orm.public.Permission.where({
      id,
    }).first();
  }

  async findPermissionByName(
    name: string,
    guardName: string,
  ): Promise<PermissionRecord | null> {
    return db.orm.public.Permission.where({
      name,
      guardName,
    }).first();
  }

  async createPermission(data: {
    name: string;
    guardName: string;
  }): Promise<PermissionRecord> {
    return db.orm.public.Permission.create(data);
  }

  async updatePermission(
    id: number,
    data: {
      name?: string;
      guardName?: string;
      updatedAt: string;
    },
  ): Promise<void> {
    await db.orm.public.Permission.where({ id }).update(data);
  }

  async deletePermission(id: number): Promise<void> {
    await db.orm.public.Permission.where({ id }).delete();
  }

  async rolesForPermission(permissionId: number): Promise<RoleRecord[]> {
    const grants = (await db.orm.public.RoleHasPermission.where({
      permissionId,
    })
      .include('role')
      .all()) as unknown as RoleGrantWithRole[];

    return grants.map((grant) => grant.role);
  }

  async permissionAssignedToRoleName(
    permissionId: number,
    roleName: string,
  ): Promise<boolean> {
    const roles = await this.rolesForPermission(permissionId);

    return roles.some((role) => role.name === roleName);
  }
}
