/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
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
import { Permissions, Roles } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser, UserAccess } from '../rbac/rbac.types.js';
import { RbacService } from '../rbac/rbac.service.js';
import { UserRepository } from './user.repository.js';
import { UserResponseDto } from './user.dto.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { User } from './user.type.js';

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  tenant_id: 'tenant-1',
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [
    Permissions.USERS_VIEW,
    Permissions.USERS_ASSIGN_ROLES,
    Permissions.USERS_ASSIGN_PERMISSIONS,
    Permissions.TENANT_VIEW,
  ],
  name: 'Maya Admin',
  email: 'maya.admin@example.test',
};

const agentUser: AuthenticatedUser = {
  ...adminUser,
  id: 'agent-1',
  role: Roles.SIMPLE_AGENT,
  roles: [Roles.SIMPLE_AGENT],
  permissions: [],
  name: 'Simple Agent',
  email: 'agent@example.test',
};

const users: User[] = [
  {
    id: adminUser.id,
    tenantId: 'tenant-1',
    role: Roles.OFFICE_ADMIN,
    name: 'Maya Admin',
    email: 'maya.admin@example.test',
    createdAt: '2026-09-14T05:15:00.000Z',
    updatedAt: '2026-09-14T05:15:00.000Z',
  },
  {
    id: 'user-2',
    tenantId: 'tenant-1',
    role: Roles.OFFICE_ADMIN,
    name: 'Maya Chen',
    email: 'maya@example.test',
    createdAt: '2026-09-14T05:16:00.000Z',
    updatedAt: '2026-09-14T05:16:00.000Z',
  },
  {
    id: 'user-3',
    tenantId: 'tenant-1',
    role: Roles.SIMPLE_AGENT,
    name: 'Noah Stone',
    email: 'noah@example.test',
    createdAt: '2026-09-14T05:17:00.000Z',
    updatedAt: '2026-09-14T05:17:00.000Z',
  },
  {
    id: 'outside-1',
    tenantId: 'tenant-2',
    role: Roles.OFFICE_ADMIN,
    name: 'Maya Outside',
    email: 'maya.outside@example.test',
    createdAt: '2026-09-14T05:18:00.000Z',
    updatedAt: '2026-09-14T05:18:00.000Z',
  },
];

class FakeUserRepository {
  findByTenantId(tenantId: string): Promise<User[]> {
    return Promise.resolve(users.filter((user) => user.tenantId === tenantId));
  }

  findMembers(options: {
    tenantId: string;
    search?: string;
    sort: 'name' | 'email' | 'role' | 'created_at';
    direction: 'asc' | 'desc';
    page?: number;
    perPage?: number;
  }): Promise<{ data: User[]; total: number }> {
    const searched = this.filterMembers(
      users.filter((user) => user.tenantId === options.tenantId),
      options.search,
    );
    const sorted = this.sortMembers(searched, options.sort, options.direction);

    if (options.page === undefined || options.perPage === undefined) {
      return Promise.resolve({ data: sorted, total: sorted.length });
    }

    const start = (options.page - 1) * options.perPage;

    return Promise.resolve({
      data: sorted.slice(start, start + options.perPage),
      total: sorted.length,
    });
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(users.find((user) => user.id === id) ?? null);
  }

  updateRole(id: string, role: string): Promise<void> {
    const user = users.find((user) => user.id === id);

    if (user) {
      user.role = role;
    }

    return Promise.resolve();
  }

  findTenantById(tenantId: string) {
    if (tenantId !== 'tenant-1') {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      id: tenantId,
      name: 'Skyline Realty',
      createdAt: '2026-09-14T05:15:00.000Z',
    });
  }

  private filterMembers(users: User[], search?: string): User[] {
    const needle = search?.trim().toLowerCase();

    if (!needle) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.role]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }

  private sortMembers(
    users: User[],
    sort: 'name' | 'email' | 'role' | 'created_at',
    direction: 'asc' | 'desc',
  ): User[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...users].sort(
      (left, right) =>
        this.sortValue(left, sort)
          .toLowerCase()
          .localeCompare(this.sortValue(right, sort).toLowerCase()) *
        multiplier,
    );
  }

  private sortValue(
    user: User,
    sort: 'name' | 'email' | 'role' | 'created_at',
  ): string {
    return sort === 'created_at' ? user.createdAt : user[sort];
  }
}

class FakeRbacService {
  private readonly syncedRoles = new Map<string, string[]>();
  private readonly syncedPermissions = new Map<string, string[]>();

  getUserAccess(userId: string): Promise<UserAccess> {
    if (this.syncedRoles.has(userId) || this.syncedPermissions.has(userId)) {
      return Promise.resolve({
        roles: this.syncedRoles.get(userId) ?? [Roles.SIMPLE_AGENT],
        directPermissions: this.syncedPermissions.get(userId) ?? [],
        rolePermissions: [],
      });
    }

    if (userId === adminUser.id) {
      return Promise.resolve({
        roles: [Roles.OFFICE_ADMIN],
        directPermissions: [Permissions.USERS_VIEW],
        rolePermissions: [Permissions.TENANT_VIEW],
      });
    }

    return Promise.resolve({
      roles: [Roles.SIMPLE_AGENT],
      directPermissions: [],
      rolePermissions: [],
    });
  }

  permissionNames(access: UserAccess): string[] {
    return [
      ...new Set([...access.directPermissions, ...access.rolePermissions]),
    ];
  }

  canManageSystemRoles(user: AuthenticatedUser): boolean {
    return (
      user.permissions.includes(Permissions.SYSTEM_BYPASS) ||
      user.permissions.includes(Permissions.ROLES_MANAGE_SYSTEM)
    );
  }

  syncUserRoles(
    _tenantId: string,
    userId: string,
    _canManageSystem: boolean,
    dto: { roles: string[] },
  ): Promise<string> {
    this.syncedRoles.set(userId, dto.roles);

    return Promise.resolve(dto.roles[0] ?? Roles.SIMPLE_AGENT);
  }

  syncUserPermissions(
    userId: string,
    _canManageSystem: boolean,
    dto: { permissions: string[] },
  ): Promise<void> {
    this.syncedPermissions.set(userId, dto.permissions);

    return Promise.resolve();
  }
}

describe('UserController API', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        Reflector,
        RbacGuard,
        UserService,
        {
          provide: UserRepository,
          useClass: FakeUserRepository,
        },
        {
          provide: RbacService,
          useClass: FakeRbacService,
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
              accessToken?: string;
            };
          };
        }) => {
          const request = context.switchToHttp().getRequest();
          const authorization = request.header('authorization');

          if (!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException({ message: 'Unauthenticated.' });
          }

          const token = authorization.slice('Bearer '.length);
          request.user = token === 'agent-token' ? agentUser : adminUser;
          request.accessToken = token;

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

  it('requires authentication for tenant-scoped endpoints', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/members')
      .expect(401)
      .expect({ message: 'Unauthenticated.' });
  });

  it('blocks tenant header crossover for the authenticated user', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/members')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-2')
      .expect(403);
  });

  it('returns the authenticated tenant for authorized users', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/tenant')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect({
        data: {
          id: 'tenant-1',
          name: 'Skyline Realty',
          created_at: '2026-09-14T05:15:00.000Z',
        },
      });
  });

  it('keeps the unpaginated members response for existing consumers', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/members')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(3);
        expect(response.body.meta).toBeUndefined();
        expect(response.body.data[0].name).toBe('Maya Admin');
        expect(response.body.data[1].name).toBe('Maya Chen');
        expect(response.body.data[0].permissions).toBeUndefined();
      });
  });

  it('searches members in paginated mode for the current tenant', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/members?page=1&per_page=10&search=maya')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(
          response.body.data.map((user: UserResponseDto) => user.name),
        ).toEqual(['Maya Admin', 'Maya Chen']);
        expect(response.body.links).toMatchObject({
          first: expect.stringContaining('/api/v1/members?'),
          last: expect.stringContaining('/api/v1/members?'),
          prev: null,
          next: null,
        });
        expect(response.body.meta).toMatchObject({
          current_page: 1,
          from: 1,
          last_page: 1,
          per_page: 10,
          to: 2,
          total: 2,
        });
        expect(response.body.meta.path).toContain('/api/v1/members');
        expect(response.body.meta.links).toEqual([
          {
            url: null,
            label: '&laquo; Previous',
            active: false,
          },
          {
            url: expect.stringContaining('/api/v1/members?'),
            label: '1',
            active: true,
          },
          {
            url: null,
            label: 'Next &raquo;',
            active: false,
          },
        ]);
        expect(response.body.data[0].permissions).toBeUndefined();
      });
  });

  it('forbids users missing the required member permission', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/members')
      .set('Authorization', 'Bearer agent-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(403);
  });

  it('returns the SPA permissions payload for the authenticated user', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/me/permissions')
      .set('Authorization', 'Bearer admin-token')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          user_id: adminUser.id,
          roles: [Roles.OFFICE_ADMIN],
          direct_permissions: [Permissions.USERS_VIEW],
          permissions: [Permissions.USERS_VIEW, Permissions.TENANT_VIEW],
        });
        expect(response.body.data.permissions).not.toContain(
          Permissions.SYSTEM_BYPASS,
        );
      });
  });

  it('syncs user roles and direct permissions', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .put('/api/v1/users/user-3/roles')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        roles: [Roles.SALES],
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          id: 'user-3',
          tenant_id: 'tenant-1',
          role: Roles.SALES,
          roles: [Roles.SALES],
          direct_permissions: [],
        });
      });

    await request(server)
      .put('/api/v1/users/user-3/permissions')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        permissions: [Permissions.CONTACTS_VIEW],
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          id: 'user-3',
          roles: [Roles.SALES],
          direct_permissions: [Permissions.CONTACTS_VIEW],
        });
      });
  });

  it('returns not found when syncing access for a user outside the tenant', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .put('/api/v1/users/outside-1/roles')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        roles: [Roles.SALES],
      })
      .expect(404);
  });

  it('forbids users missing access assignment permissions', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .put('/api/v1/users/user-3/roles')
      .set('Authorization', 'Bearer agent-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        roles: [Roles.SALES],
      })
      .expect(403);
  });

  it('wraps the users list in the standard API response envelope', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.message).toBe('Success');
        expect(response.body.data).toHaveLength(3);
      });
  });

  it('returns not found when a user belongs to another tenant', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/users/outside-1')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(404);
  });
});
