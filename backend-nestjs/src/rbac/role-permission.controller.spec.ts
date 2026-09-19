/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthGuard } from '../auth/auth.guard.js';
import {
  PermissionResponseDto,
  RoleResponseDto,
  StorePermissionDto,
  StoreRoleDto,
  UpdatePermissionDto,
  UpdateRoleDto,
} from './rbac.dto.js';
import { RbacGuard } from './rbac.guard.js';
import { Permissions, Roles } from './rbac.constants.js';
import { RbacService } from './rbac.service.js';
import { AuthenticatedUser } from './rbac.types.js';
import { RolePermissionController } from './role-permission.controller.js';

const timestamp = '2026-09-14T05:15:00.000Z';

const tenantAdmin: AuthenticatedUser = {
  id: 'admin-1',
  tenant_id: 'tenant-1',
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [
    Permissions.ROLES_VIEW,
    Permissions.ROLES_CREATE,
    Permissions.ROLES_UPDATE,
    Permissions.ROLES_DELETE,
    Permissions.PERMISSIONS_VIEW,
  ],
  name: 'Maya Admin',
  email: 'maya.admin@example.test',
};

const systemAdmin: AuthenticatedUser = {
  ...tenantAdmin,
  id: 'system-1',
  role: Roles.SYSTEM_ADMIN,
  roles: [Roles.SYSTEM_ADMIN],
  permissions: [Permissions.SYSTEM_BYPASS],
};

const simpleAgent: AuthenticatedUser = {
  ...tenantAdmin,
  id: 'agent-1',
  role: Roles.SIMPLE_AGENT,
  roles: [Roles.SIMPLE_AGENT],
  permissions: [],
};

const contactsViewPermission: PermissionResponseDto = {
  id: 1,
  name: Permissions.CONTACTS_VIEW,
  guard_name: 'web',
  created_at: timestamp,
  updated_at: timestamp,
};

const salesRole: RoleResponseDto = {
  id: 10,
  tenant_id: 'tenant-1',
  is_system: false,
  name: Roles.SALES,
  guard_name: 'web',
  created_at: timestamp,
  updated_at: timestamp,
};

class FakeRbacService {
  roleDeleted?: string;
  permissionDeleted?: string;
  listRolesCall?: {
    tenantId: string;
    canManageSystem: boolean;
    includes: string[];
  };
  listPermissionsCall?: {
    canManageSystem: boolean;
    includes: string[];
  };

  canManageSystemRoles(user: AuthenticatedUser): boolean {
    return (
      user.permissions.includes(Permissions.SYSTEM_BYPASS) ||
      user.permissions.includes(Permissions.ROLES_MANAGE_SYSTEM)
    );
  }

  listRoles(
    tenantId: string,
    canManageSystem: boolean,
    includes: string[] = [],
  ): Promise<RoleResponseDto[]> {
    this.listRolesCall = { tenantId, canManageSystem, includes };

    return Promise.resolve([
      includes.includes('permissions')
        ? { ...salesRole, permissions: [contactsViewPermission] }
        : salesRole,
    ]);
  }

  createRole(
    tenantId: string,
    canManageSystem: boolean,
    dto: StoreRoleDto,
  ): Promise<RoleResponseDto> {
    return Promise.resolve({
      ...salesRole,
      id: 11,
      tenant_id: dto.tenant_id === undefined ? tenantId : dto.tenant_id,
      is_system: dto.tenant_id === null,
      name: dto.name,
      guard_name: dto.guard_name ?? 'web',
    });
  }

  findRole(
    tenantId: string,
    roleId: string,
    canManageSystem: boolean,
    includes: string[] = [],
  ): Promise<RoleResponseDto> {
    return Promise.resolve({
      ...(includes.includes('permissions')
        ? { ...salesRole, permissions: [contactsViewPermission] }
        : salesRole),
      id: Number(roleId),
      tenant_id: tenantId,
    });
  }

  updateRole(
    tenantId: string,
    roleId: string,
    canManageSystem: boolean,
    dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return Promise.resolve({
      ...salesRole,
      id: Number(roleId),
      tenant_id: dto.tenant_id === undefined ? tenantId : dto.tenant_id,
      is_system: dto.tenant_id === null,
      name: dto.name ?? salesRole.name,
      guard_name: dto.guard_name ?? salesRole.guard_name,
    });
  }

  deleteRole(
    tenantId: string,
    roleId: string,
    canManageSystem: boolean,
  ): Promise<void> {
    this.roleDeleted = `${tenantId}:${roleId}:${canManageSystem}`;
    return Promise.resolve();
  }

  listPermissions(
    canManageSystem: boolean,
    includes: string[] = [],
  ): Promise<PermissionResponseDto[]> {
    this.listPermissionsCall = { canManageSystem, includes };

    return Promise.resolve([
      includes.includes('roles')
        ? { ...contactsViewPermission, roles: [salesRole] }
        : contactsViewPermission,
    ]);
  }

  createPermission(dto: StorePermissionDto): Promise<PermissionResponseDto> {
    return Promise.resolve({
      ...contactsViewPermission,
      id: 20,
      name: dto.name,
      guard_name: dto.guard_name ?? 'web',
    });
  }

  findPermission(
    permissionId: string,
    canManageSystem: boolean,
    includes: string[] = [],
  ): Promise<PermissionResponseDto> {
    return Promise.resolve({
      ...(includes.includes('roles')
        ? { ...contactsViewPermission, roles: [salesRole] }
        : contactsViewPermission),
      id: Number(permissionId),
    });
  }

  updatePermission(
    permissionId: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return Promise.resolve({
      ...contactsViewPermission,
      id: Number(permissionId),
      name: dto.name ?? contactsViewPermission.name,
      guard_name: dto.guard_name ?? contactsViewPermission.guard_name,
    });
  }

  deletePermission(permissionId: string): Promise<void> {
    this.permissionDeleted = permissionId;
    return Promise.resolve();
  }
}

describe('RolePermissionController API', () => {
  let app: INestApplication<App>;
  let rbacService: FakeRbacService;

  beforeEach(async () => {
    rbacService = new FakeRbacService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RolePermissionController],
      providers: [
        Reflector,
        RbacGuard,
        {
          provide: RbacService,
          useValue: rbacService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              header: (name: string) => string | undefined;
              user?: AuthenticatedUser;
            };
          };
        }) => {
          const request = context.switchToHttp().getRequest();
          const authorization = request.header('authorization');

          if (!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException({ message: 'Unauthenticated.' });
          }

          const token = authorization.slice('Bearer '.length);
          request.user =
            token === 'system-token'
              ? systemAdmin
              : token === 'agent-token'
                ? simpleAgent
                : tenantAdmin;

          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication for role resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/roles')
      .expect(401)
      .expect({ message: 'Unauthenticated.' });
  });

  it('blocks tenant header crossover for role resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/roles')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-2')
      .expect(403);
  });

  it('lists roles with optional permission includes', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .get('/api/v1/roles')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data[0].permissions).toBeUndefined();
      });

    await request(server)
      .get('/api/v1/roles?include[]=permissions')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data[0].permissions[0].name).toBe(
          Permissions.CONTACTS_VIEW,
        );
      });

    expect(rbacService.listRolesCall).toEqual({
      tenantId: 'tenant-1',
      canManageSystem: false,
      includes: ['permissions'],
    });
  });

  it('creates, updates, and deletes roles with Laravel-compatible statuses', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .post('/api/v1/roles')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        name: 'Inside Sales',
        permissions: [Permissions.CONTACTS_VIEW],
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          tenant_id: 'tenant-1',
          name: 'Inside Sales',
          guard_name: 'web',
        });
        expect(response.body.data.permissions).toBeUndefined();
      });

    await request(server)
      .patch('/api/v1/roles/11')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        name: 'Senior Inside Sales',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.name).toBe('Senior Inside Sales');
      });

    await request(server)
      .delete('/api/v1/roles/11')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(204);

    expect(rbacService.roleDeleted).toBe('tenant-1:11:false');
  });

  it('forbids users missing role permissions', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/roles')
      .set('Authorization', 'Bearer agent-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(403);
  });

  it('lists and shows permissions with optional role includes', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .get('/api/v1/permissions?include[]=roles')
      .set('Authorization', 'Bearer admin-token')
      .expect(200)
      .expect((response) => {
        expect(response.body.data[0].roles[0].name).toBe(Roles.SALES);
      });

    await request(server)
      .get('/api/v1/permissions/1?include[]=roles')
      .set('Authorization', 'Bearer admin-token')
      .expect(200)
      .expect((response) => {
        expect(response.body.data.roles[0].name).toBe(Roles.SALES);
      });

    expect(rbacService.listPermissionsCall).toEqual({
      canManageSystem: false,
      includes: ['roles'],
    });
  });

  it('requires system bypass to mutate permissions', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .post('/api/v1/permissions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'custom.permission',
      })
      .expect(403);

    await request(server)
      .post('/api/v1/permissions')
      .set('Authorization', 'Bearer system-token')
      .send({
        name: 'custom.permission',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.name).toBe('custom.permission');
      });

    await request(server)
      .put('/api/v1/permissions/20')
      .set('Authorization', 'Bearer system-token')
      .send({
        name: 'custom.permission.updated',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.name).toBe('custom.permission.updated');
      });

    await request(server)
      .delete('/api/v1/permissions/20')
      .set('Authorization', 'Bearer system-token')
      .expect(204);

    expect(rbacService.permissionDeleted).toBe('20');
  });
});
