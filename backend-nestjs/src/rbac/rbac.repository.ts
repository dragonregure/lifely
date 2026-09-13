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
};

type PermissionRecord = {
  id: number;
  name: string;
  guardName: string;
};

type RoleAssignmentWithRole = {
  roleId: number;
  role: {
    name: string;
  };
};

type PermissionGrantWithPermission = {
  permission: {
    name: string;
  };
};

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
}
