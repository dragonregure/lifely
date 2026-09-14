import { Injectable } from '@nestjs/common';
import {
  Tenant as TenantModel,
  User as UserModel,
} from '../prisma/prisma.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { UserResponseDto } from './user.dto.js';
import { User } from './user.type.js';

type TenantRecord = {
  id: string;
  name: string;
  createdAt: string;
};

@Injectable()
export class UserRepository {
  constructor(private readonly rbacService: RbacService) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await UserModel.all();
    return Promise.all(users.map((user) => this.toResponse(user)));
  }

  async findByTenantId(tenantId: string): Promise<UserResponseDto[]> {
    const users = (await UserModel.where({ tenantId }).all()) as User[];
    return Promise.all(users.map((user) => this.toResponse(user)));
  }

  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await UserModel.where({ id }).first();
    return user ? this.toResponse(user) : null;
  }

  async findTenantById(tenantId: string): Promise<TenantRecord | null> {
    return await TenantModel.where({
      id: tenantId,
    }).first();
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await UserModel.where({ email }).first();
    return user ? this.toResponse(user) : null;
  }

  private async toResponse(user: User): Promise<UserResponseDto> {
    const access = await this.rbacService.getUserAccess(user.id);

    return {
      id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
      roles: access.roles,
      direct_permissions: access.directPermissions,
      permissions: this.rbacService.permissionNames(access),
      name: user.name,
      email: user.email,
      created_at: user.createdAt,
    };
  }
}
