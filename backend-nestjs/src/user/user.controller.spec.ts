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

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  tenant_id: 'tenant-1',
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [Permissions.USERS_VIEW, Permissions.TENANT_VIEW],
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

const users: UserResponseDto[] = [
  {
    id: adminUser.id,
    tenant_id: 'tenant-1',
    role: Roles.OFFICE_ADMIN,
    roles: [Roles.OFFICE_ADMIN],
    direct_permissions: [Permissions.USERS_VIEW],
    permissions: [Permissions.USERS_VIEW, Permissions.TENANT_VIEW],
    name: 'Maya Admin',
    email: 'maya.admin@example.test',
    created_at: '2026-09-14T05:15:00.000Z',
  },
  {
    id: 'user-2',
    tenant_id: 'tenant-1',
    role: Roles.OFFICE_ADMIN,
    roles: [Roles.OFFICE_ADMIN],
    direct_permissions: [],
    permissions: [],
    name: 'Maya Chen',
    email: 'maya@example.test',
    created_at: '2026-09-14T05:16:00.000Z',
  },
  {
    id: 'user-3',
    tenant_id: 'tenant-1',
    role: Roles.SIMPLE_AGENT,
    roles: [Roles.SIMPLE_AGENT],
    direct_permissions: [],
    permissions: [],
    name: 'Noah Stone',
    email: 'noah@example.test',
    created_at: '2026-09-14T05:17:00.000Z',
  },
  {
    id: 'outside-1',
    tenant_id: 'tenant-2',
    role: Roles.OFFICE_ADMIN,
    roles: [Roles.OFFICE_ADMIN],
    direct_permissions: [],
    permissions: [],
    name: 'Maya Outside',
    email: 'maya.outside@example.test',
    created_at: '2026-09-14T05:18:00.000Z',
  },
];

class FakeUserRepository {
  findByTenantId(tenantId: string): Promise<UserResponseDto[]> {
    return Promise.resolve(users.filter((user) => user.tenant_id === tenantId));
  }

  findById(id: string): Promise<UserResponseDto | null> {
    return Promise.resolve(users.find((user) => user.id === id) ?? null);
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
}

class FakeRbacService {
  getUserAccess(userId: string): Promise<UserAccess> {
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
