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
import { Permissions, Roles } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import type { AuthenticatedUser } from '../rbac/rbac.types.js';
import { ReferenceController } from './reference.controller.js';
import { REFERENCE_TYPE_GROUP } from './reference.constants.js';
import {
  DuplicateReferenceError,
  ReferenceRepository,
} from './reference.repository.js';
import type {
  ReferenceCreateInput,
  ReferenceQueryOptions,
  ReferenceUpdateInput,
} from './reference.repository.js';
import { ReferenceService } from './reference.service.js';
import type { Reference } from './reference.type.js';

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  tenant_id: 'tenant-1',
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [
    Permissions.REFERENCES_VIEW,
    Permissions.REFERENCES_CREATE,
    Permissions.REFERENCES_UPDATE,
    Permissions.REFERENCES_DELETE,
  ],
  name: 'Maya Admin',
  email: 'maya.admin@example.test',
};

const viewerUser: AuthenticatedUser = {
  ...adminUser,
  id: 'viewer-1',
  permissions: [Permissions.REFERENCES_VIEW],
  name: 'Viewer Agent',
  email: 'viewer@example.test',
};

const systemManagerUser: AuthenticatedUser = {
  ...adminUser,
  id: 'system-manager-1',
  permissions: [...adminUser.permissions, Permissions.REFERENCES_MANAGE_SYSTEM],
  name: 'System Manager',
  email: 'system.manager@example.test',
};

const systemOnlyUser: AuthenticatedUser = {
  ...viewerUser,
  id: 'system-only-1',
  permissions: [Permissions.REFERENCES_MANAGE_SYSTEM],
  name: 'System Only',
  email: 'system.only@example.test',
};

const bypassUser: AuthenticatedUser = {
  ...viewerUser,
  id: 'bypass-1',
  permissions: [Permissions.SYSTEM_BYPASS],
  name: 'Bypass Agent',
  email: 'bypass@example.test',
};

let references: Reference[];

const baseReference = (overrides: Partial<Reference> = {}): Reference => ({
  id: 'reference-1',
  tenantId: 'tenant-1',
  group: 'street_type',
  referenceKey: 'ave',
  value: 'Avenue',
  type: 'string',
  meta: null,
  status: 'ACTIVE',
  createdAt: '2026-09-14T05:15:00.000Z',
  updatedAt: '2026-09-14T05:15:00.000Z',
  deletedAt: null,
  ...overrides,
});

class FakeReferenceRepository {
  find(
    options: ReferenceQueryOptions,
  ): Promise<{ data: Reference[]; total: number }> {
    let data = references.filter(
      (reference) =>
        reference.deletedAt === null &&
        (reference.tenantId === null ||
          reference.tenantId === options.tenantId),
    );

    if (options.group) {
      data = data.filter((reference) => reference.group === options.group);
    }

    if (options.type) {
      data = data.filter((reference) => reference.type === options.type);
    }

    if (options.status) {
      data = data.filter((reference) => reference.status === options.status);
    }

    if (options.scope === 'system') {
      data = data.filter((reference) => reference.tenantId === null);
    }

    if (options.scope === 'tenant') {
      data = data.filter(
        (reference) => reference.tenantId === options.tenantId,
      );
    }

    if (options.search) {
      const needle = options.search.toLowerCase();
      data = data.filter((reference) =>
        [
          reference.group,
          reference.referenceKey,
          reference.value,
          reference.type,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }

    const total = data.length;
    const start = (options.page - 1) * options.perPage;

    return Promise.resolve({
      data: data.slice(start, start + options.perPage),
      total,
    });
  }

  findById(tenantId: string, id: string): Promise<Reference | null> {
    return Promise.resolve(
      references.find(
        (reference) =>
          reference.id === id &&
          reference.deletedAt === null &&
          (reference.tenantId === null || reference.tenantId === tenantId),
      ) ?? null,
    );
  }

  referenceTypeOptions(
    tenantId: string,
  ): Promise<Array<{ label: string; value: string }>> {
    return Promise.resolve(
      references
        .filter(
          (reference) =>
            reference.deletedAt === null &&
            reference.group === REFERENCE_TYPE_GROUP &&
            (reference.tenantId === null || reference.tenantId === tenantId),
        )
        .map((reference) => ({
          label: reference.value ?? reference.referenceKey,
          value: reference.referenceKey,
        })),
    );
  }

  groupOptions(
    tenantId: string,
  ): Promise<Array<{ label: string; value: string }>> {
    const groups = [
      ...new Set(
        references
          .filter(
            (reference) =>
              reference.deletedAt === null &&
              (reference.tenantId === null || reference.tenantId === tenantId),
          )
          .map((reference) => reference.group),
      ),
    ].sort();

    return Promise.resolve(
      groups.map((group) => ({
        label: group
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (value) => value.toUpperCase()),
        value: group,
      })),
    );
  }

  create(data: ReferenceCreateInput): Promise<Reference> {
    const tenantId =
      data.tenantId === undefined ? data.currentTenantId : data.tenantId;

    this.ensureUnique(tenantId, data.group, data.key);

    const reference = baseReference({
      id: `reference-${references.length + 1}`,
      tenantId,
      group: data.group,
      referenceKey: data.key,
      value: data.value ?? null,
      type: data.type ?? 'string',
      meta: data.meta ?? null,
      status: data.status ?? 'ACTIVE',
    });

    references.push(reference);

    return Promise.resolve(reference);
  }

  update(
    tenantId: string,
    id: string,
    data: ReferenceUpdateInput,
  ): Promise<Reference | null> {
    const index = references.findIndex(
      (reference) =>
        reference.id === id &&
        reference.deletedAt === null &&
        (reference.tenantId === null || reference.tenantId === tenantId),
    );

    if (index === -1) {
      return Promise.resolve(null);
    }

    const current = references[index];
    const nextTenantId =
      data.tenantId === undefined ? current.tenantId : data.tenantId;
    const nextGroup = data.group ?? current.group;
    const nextKey = data.key ?? current.referenceKey;

    this.ensureUnique(nextTenantId, nextGroup, nextKey, id);

    references[index] = {
      ...current,
      tenantId: nextTenantId,
      group: nextGroup,
      referenceKey: nextKey,
      ...(data.value !== undefined ? { value: data.value ?? null } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.meta !== undefined ? { meta: data.meta ?? null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    };

    return Promise.resolve(references[index]);
  }

  delete(tenantId: string, id: string): Promise<boolean> {
    const index = references.findIndex(
      (reference) =>
        reference.id === id &&
        reference.deletedAt === null &&
        (reference.tenantId === null || reference.tenantId === tenantId),
    );

    if (index === -1) {
      return Promise.resolve(false);
    }

    references[index] = {
      ...references[index],
      deletedAt: '2026-09-15T08:00:00.000Z',
    };

    return Promise.resolve(true);
  }

  private ensureUnique(
    tenantId: string | null,
    group: string,
    key: string,
    ignoreId?: string,
  ): void {
    const exists = references.some(
      (reference) =>
        reference.id !== ignoreId &&
        reference.deletedAt === null &&
        reference.tenantId === tenantId &&
        reference.group === group &&
        reference.referenceKey === key,
    );

    if (exists) {
      throw new DuplicateReferenceError();
    }
  }
}

describe('ReferenceController API', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    references = [
      baseReference({
        id: 'system-street',
        tenantId: null,
        referenceKey: 'ave',
      }),
      baseReference({
        id: 'tenant-street',
        referenceKey: 'mews',
        value: 'Mews',
      }),
      baseReference({
        id: 'outside-street',
        tenantId: 'tenant-2',
        referenceKey: 'hidden',
        value: 'Hidden',
      }),
      baseReference({
        id: 'type-string',
        tenantId: null,
        group: REFERENCE_TYPE_GROUP,
        referenceKey: 'string',
        value: 'String',
      }),
      baseReference({
        id: 'type-int',
        tenantId: null,
        group: REFERENCE_TYPE_GROUP,
        referenceKey: 'int',
        value: 'Integer',
      }),
      baseReference({
        id: 'typed-int',
        tenantId: null,
        group: 'typed_values',
        referenceKey: 'max_retries',
        value: '3',
        type: 'int',
      }),
      baseReference({
        id: 'typed-bool',
        tenantId: null,
        group: 'typed_values',
        referenceKey: 'enabled',
        value: 'true',
        type: 'bool',
      }),
    ];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReferenceController],
      providers: [
        Reflector,
        RbacGuard,
        ReferenceService,
        {
          provide: ReferenceRepository,
          useClass: FakeReferenceRepository,
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
          request.user =
            token === 'viewer-token'
              ? viewerUser
              : token === 'system-token'
                ? systemManagerUser
                : token === 'system-only-token'
                  ? systemOnlyUser
                  : token === 'bypass-token'
                    ? bypassUser
                    : adminUser;
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

  it('requires authentication for reference resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/references')
      .expect(401)
      .expect({ message: 'Unauthenticated.' });
  });

  it('blocks tenant header crossover for references', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/references')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-2')
      .expect(403);
  });

  it('lists system and current tenant references only with cast values', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/references?filter[group]=typed_values')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'max_retries', value: 3 }),
            expect.objectContaining({ key: 'enabled', value: true }),
          ]),
        );
        expect(response.body.data).toEqual(
          expect.not.arrayContaining([
            expect.objectContaining({ key: 'hidden' }),
          ]),
        );
      });
  });

  it('returns reference type and group options independently from table filters', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .get('/api/v1/references?filter[group]=missing_group')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(0);
      });

    await request(server)
      .get('/api/v1/references/types')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual(
          expect.arrayContaining([
            { label: 'String', value: 'string' },
            { label: 'Integer', value: 'int' },
          ]),
        );
      });

    await request(server)
      .get('/api/v1/references/groups')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual(
          expect.arrayContaining([
            { label: 'Reference Type', value: REFERENCE_TYPE_GROUP },
            { label: 'Street Type', value: 'street_type' },
          ]),
        );
      });
  });

  it('creates updates and deletes tenant references', async () => {
    const server = app.getHttpServer() as unknown as App;

    const create = await request(server)
      .post('/api/v1/references')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        group: 'street_type',
        key: 'cres',
        value: 'Crescent',
        type: 'string',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          tenant_id: 'tenant-1',
          is_system: false,
          key: 'cres',
          value: 'Crescent',
        });
      });

    const referenceId = create.body.data.id as string;

    await request(server)
      .patch(`/api/v1/references/${referenceId}`)
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ value: 'Crescent Road' })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.value).toBe('Crescent Road');
      });

    await request(server)
      .put(`/api/v1/references/${referenceId}`)
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ value: 'Crescent Avenue' })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.value).toBe('Crescent Avenue');
      });

    await request(server)
      .delete(`/api/v1/references/${referenceId}`)
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(204);
  });

  it('requires system permission to create update or delete system references', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .post('/api/v1/references')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        tenant_id: null,
        group: 'street_type',
        key: 'trl',
        value: 'Trail',
      })
      .expect(422)
      .expect((response) => {
        expect(response.body.errors.tenant_id).toEqual([
          'Only System Admin can create system references.',
        ]);
      });

    await request(server)
      .patch('/api/v1/references/system-street')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ value: 'Updated system' })
      .expect(403);

    await request(server)
      .delete('/api/v1/references/system-street')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(403);
  });

  it('forbids view-only users from mutating tenant references', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .patch('/api/v1/references/tenant-street')
      .set('Authorization', 'Bearer viewer-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ value: 'Updated tenant' })
      .expect(403);

    await request(server)
      .delete('/api/v1/references/tenant-street')
      .set('Authorization', 'Bearer viewer-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(403);
  });

  it('allows references.manage_system and system.bypass to manage system references', async () => {
    const server = app.getHttpServer() as unknown as App;

    const create = await request(server)
      .post('/api/v1/references')
      .set('Authorization', 'Bearer system-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        tenant_id: null,
        group: 'street_type',
        key: 'walk',
        value: 'Walk',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          tenant_id: null,
          is_system: true,
        });
      });

    const referenceId = create.body.data.id as string;

    await request(server)
      .patch(`/api/v1/references/${referenceId}`)
      .set('Authorization', 'Bearer system-only-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ value: 'Walkway' })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.value).toBe('Walkway');
      });

    await request(server)
      .delete(`/api/v1/references/${referenceId}`)
      .set('Authorization', 'Bearer bypass-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(204);
  });

  it('rejects duplicate group and key within the same scope', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/references')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        group: 'street_type',
        key: 'mews',
        value: 'Mews Duplicate',
      })
      .expect(422)
      .expect((response) => {
        expect(response.body.errors.group).toEqual([
          'The group and key pair already exists for this reference scope.',
        ]);
        expect(response.body.errors.key).toEqual([
          'The group and key pair already exists for this reference scope.',
        ]);
      });
  });
});
