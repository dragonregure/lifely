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
import { ActivityService } from '../activity/activity.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { Permissions, Roles } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { UserService } from '../user/user.service.js';
import { User } from '../user/user.type.js';
import { ContactController } from './contact.controller.js';
import { ContactRepository, ContactSortKey } from './contact.repository.js';
import { ContactService } from './contact.service.js';
import { Contact } from './contact.type.js';

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  tenant_id: 'tenant-1',
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [
    Permissions.CONTACTS_VIEW,
    Permissions.CONTACTS_CREATE,
    Permissions.CONTACTS_UPDATE,
    Permissions.CONTACTS_DELETE,
  ],
  name: 'Maya Admin',
  email: 'maya.admin@example.test',
};

const ownerId = '018f8de0-7424-7c71-a0f9-14d364f50d84';
const outsideOwnerId = '018f8de0-7424-7c71-a0f9-14d364f50d85';

const viewerUser: AuthenticatedUser = {
  ...adminUser,
  id: 'viewer-1',
  permissions: [Permissions.CONTACTS_VIEW],
  name: 'Viewer Agent',
  email: 'viewer@example.test',
};

const tenantUsers: User[] = [
  {
    id: ownerId,
    tenantId: 'tenant-1',
    role: Roles.SALES,
    name: 'Owner One',
    email: 'owner@example.test',
    createdAt: '2026-09-14T05:15:00.000Z',
    updatedAt: '2026-09-14T05:15:00.000Z',
  },
  {
    id: outsideOwnerId,
    tenantId: 'tenant-2',
    role: Roles.SALES,
    name: 'Outside Owner',
    email: 'outside@example.test',
    createdAt: '2026-09-14T05:15:00.000Z',
    updatedAt: '2026-09-14T05:15:00.000Z',
  },
];

let contacts: Contact[];

const baseContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'contact-1',
  tenantId: 'tenant-1',
  ownerId,
  firstName: 'Ethan',
  lastName: 'Miller',
  email: 'ethan@example.com',
  phone: '+62812345678',
  status: true,
  budget: '500000.00',
  source: 1,
  lastContactedAt: '2026-05-30T00:00:00.000Z',
  createdAt: '2026-09-14T05:15:00.000Z',
  updatedAt: '2026-09-14T05:15:00.000Z',
  ...overrides,
});

class FakeContactRepository {
  find(options: {
    tenantId: string;
    search?: string;
    status?: string;
    source?: string;
    ownerId?: string;
    sort: ContactSortKey;
    direction: 'asc' | 'desc';
    page: number;
    perPage: number;
  }): Promise<{ data: Contact[]; total: number }> {
    let data = contacts.filter(
      (contact) => contact.tenantId === options.tenantId,
    );

    if (options.status === 'active') {
      data = data.filter((contact) => contact.status);
    }

    if (options.source === 'Website,Referral') {
      data = data.filter((contact) => [1, 4].includes(contact.source ?? -1));
    }

    if (options.ownerId) {
      const ownerIds = options.ownerId.split(',');
      data = data.filter(
        (contact) =>
          contact.ownerId !== null && ownerIds.includes(contact.ownerId),
      );
    }

    if (options.search) {
      const needle = options.search.toLowerCase();
      data = data.filter((contact) =>
        [contact.firstName, contact.lastName, contact.email]
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

  findById(tenantId: string, id: string): Promise<Contact | null> {
    return Promise.resolve(
      contacts.find(
        (contact) => contact.tenantId === tenantId && contact.id === id,
      ) ?? null,
    );
  }

  create(data: {
    tenantId: string;
    ownerId?: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    status?: boolean;
    budget?: number | null;
    source?: number | null;
    lastContactedAt?: string | null;
  }): Promise<Contact> {
    const contact = baseContact({
      id: `contact-${contacts.length + 1}`,
      tenantId: data.tenantId,
      ownerId: data.ownerId ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      status: data.status ?? true,
      budget:
        data.budget === undefined || data.budget === null
          ? null
          : String(data.budget),
      source: data.source ?? 0,
      lastContactedAt: data.lastContactedAt ?? null,
    });

    contacts.push(contact);

    return Promise.resolve(contact);
  }

  update(
    tenantId: string,
    id: string,
    data: {
      ownerId?: string | null;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string | null;
      status?: boolean;
      budget?: number | null;
      source?: number | null;
      lastContactedAt?: string | null;
    },
  ): Promise<Contact | null> {
    const index = contacts.findIndex(
      (contact) => contact.tenantId === tenantId && contact.id === id,
    );

    if (index === -1) {
      return Promise.resolve(null);
    }

    contacts[index] = {
      ...contacts[index],
      ...(data.ownerId !== undefined ? { ownerId: data.ownerId } : {}),
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.budget !== undefined
        ? { budget: data.budget === null ? null : String(data.budget) }
        : {}),
      ...(data.source !== undefined ? { source: data.source } : {}),
      ...(data.lastContactedAt !== undefined
        ? { lastContactedAt: data.lastContactedAt }
        : {}),
    };

    return Promise.resolve(contacts[index]);
  }

  delete(tenantId: string, id: string): Promise<boolean> {
    const originalLength = contacts.length;

    contacts = contacts.filter(
      (contact) => !(contact.tenantId === tenantId && contact.id === id),
    );

    return Promise.resolve(contacts.length !== originalLength);
  }
}

class FakeUserService {
  userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    return Promise.resolve(
      tenantUsers.some(
        (user) => user.id === userId && user.tenantId === tenantId,
      ),
    );
  }
}

class FakeActivityService {
  recordContactCreated(): Promise<void> {
    return Promise.resolve();
  }

  recordContactUpdated(): Promise<void> {
    return Promise.resolve();
  }

  recordContactDeleted(): Promise<void> {
    return Promise.resolve();
  }
}

describe('ContactController API', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    contacts = [
      baseContact(),
      baseContact({
        id: 'contact-2',
        ownerId,
        firstName: 'Liam',
        email: 'liam@example.com',
        source: 4,
      }),
      baseContact({
        id: 'contact-3',
        firstName: 'Zara',
        email: 'zara@example.com',
        source: 7,
      }),
      baseContact({
        id: 'inactive-contact',
        firstName: 'Inactive',
        email: 'inactive@example.com',
        status: false,
      }),
      baseContact({
        id: 'outside-contact',
        tenantId: 'tenant-2',
        firstName: 'Outside',
        email: 'outside@example.com',
      }),
    ];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        Reflector,
        RbacGuard,
        ContactService,
        {
          provide: ContactRepository,
          useClass: FakeContactRepository,
        },
        {
          provide: ActivityService,
          useClass: FakeActivityService,
        },
        {
          provide: UserService,
          useClass: FakeUserService,
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
          request.user = token === 'viewer-token' ? viewerUser : adminUser;
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

  it('requires authentication for contact resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/contacts')
      .expect(401)
      .expect({ message: 'Unauthenticated.' });
  });

  it('blocks tenant header crossover for contact resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/contacts')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-2')
      .expect(403);
  });

  it('lists paginated contacts for the current tenant', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/contacts?page=1&per_page=2&search=ethan')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          id: 'contact-1',
          tenant_id: 'tenant-1',
          first_name: 'Ethan',
          status: true,
          status_label: 'Active',
          source_id: 1,
          source: 'Website',
        });
        expect(response.body.meta).toMatchObject({
          current_page: 1,
          per_page: 2,
          total: 1,
        });
      });
  });

  it('supports owner, source, and status filters', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get(
        `/api/v1/contacts?filter[owner_id]=${ownerId}&filter[source]=Website,Referral&filter[status]=active`,
      )
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: Array<{ id: string }>;
          links: { first: string };
        };

        expect(body.data.map((contact) => contact.id)).toEqual([
          'contact-1',
          'contact-2',
        ]);
        expect(body.links.first).toContain('filter%5Bstatus%5D=active');
      });
  });

  it('creates a contact with the Laravel response shape', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/contacts')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        owner_id: ownerId,
        first_name: 'Nadia',
        last_name: 'Stone',
        email: 'nadia@example.com',
        phone: '+62811111111',
        status: true,
        budget: 450000,
        source: 4,
        last_contacted_at: '2026-05-30T00:00:00Z',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          tenant_id: 'tenant-1',
          owner_id: ownerId,
          first_name: 'Nadia',
          email: 'nadia@example.com',
          status: true,
          status_label: 'Active',
          budget: 450000,
          source_id: 4,
          source: 'Referral',
        });
      });
  });

  it('updates a contact with PATCH and PUT routes', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .patch('/api/v1/contacts/contact-1')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        status: false,
        budget: 725000,
        source: 13,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          id: 'contact-1',
          status: false,
          status_label: 'Inactive',
          budget: 725000,
          source_id: 13,
          source: 'Open House',
        });
      });

    await request(server)
      .put('/api/v1/contacts/contact-1')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        first_name: 'Ethan Updated',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.first_name).toBe('Ethan Updated');
      });
  });

  it('deletes contacts only within the current tenant', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .delete('/api/v1/contacts/contact-1')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(204);

    await request(server)
      .delete('/api/v1/contacts/outside-contact')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(404);
  });

  it('forbids users missing the required mutation permission', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .delete('/api/v1/contacts/contact-1')
      .set('Authorization', 'Bearer viewer-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(403);
  });

  it('rejects owners outside the authenticated tenant', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/contacts')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        owner_id: outsideOwnerId,
        first_name: 'Nadia',
        last_name: 'Stone',
        email: 'nadia@example.com',
      })
      .expect(422)
      .expect((response) => {
        expect(response.body.errors.owner_id).toEqual([
          'The selected owner id is invalid.',
        ]);
      });
  });
});
