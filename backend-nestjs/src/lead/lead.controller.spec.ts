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
import { ContactResponseDto } from '../contact/contact.dto.js';
import { ContactService } from '../contact/contact.service.js';
import { ListingResponseDto } from '../listing/listing.dto.js';
import { ListingService } from '../listing/listing.service.js';
import { Permissions, Roles } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { MemberResponseDto } from '../user/user.dto.js';
import { UserService } from '../user/user.service.js';
import { LeadStages, LeadSources } from './lead.constants.js';
import { LeadController } from './lead.controller.js';
import {
  LeadCreateInput,
  LeadQueryOptions,
  LeadRepository,
  LeadUpdateInput,
} from './lead.repository.js';
import { LeadService } from './lead.service.js';
import { Lead } from './lead.type.js';

const contactId = '018f8de0-7424-7c71-a0f9-14d364f50d84';
const inactiveContactId = '018f8de0-7424-7c71-a0f9-14d364f50d85';
const outsideContactId = '018f8de0-7424-7c71-a0f9-14d364f50d86';
const listingId = '018f8de0-7f2d-7c71-bb64-347037ba9a57';
const soldListingId = '018f8de0-7f2d-7c71-bb64-347037ba9a58';
const outsideListingId = '018f8de0-7f2d-7c71-bb64-347037ba9a59';
const agentId = '018f8de0-6aba-7c71-b65d-95302af6be84';
const otherAgentId = '018f8de0-6aba-7c71-b65d-95302af6be85';
const outsideAgentId = '018f8de0-6aba-7c71-b65d-95302af6be86';

const adminUser: AuthenticatedUser = {
  id: agentId,
  tenant_id: 'tenant-1',
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [
    Permissions.LEADS_VIEW,
    Permissions.LEADS_CREATE,
    Permissions.LEADS_UPDATE,
    Permissions.LEADS_CHANGE_ASSIGNEE,
    Permissions.LEADS_ASSIGN_TO_SELF,
  ],
  name: 'Maya Admin',
  email: 'maya.admin@example.test',
};

const viewerUser: AuthenticatedUser = {
  ...adminUser,
  id: otherAgentId,
  permissions: [Permissions.LEADS_VIEW],
  name: 'Viewer Agent',
  email: 'viewer@example.test',
};

const assignSelfUser: AuthenticatedUser = {
  ...adminUser,
  permissions: [Permissions.LEADS_CREATE, Permissions.LEADS_ASSIGN_TO_SELF],
};

const updateUser: AuthenticatedUser = {
  ...adminUser,
  permissions: [Permissions.LEADS_UPDATE],
};

let leads: Lead[];
let contacts: ContactResponseDto[];
let listings: ListingResponseDto[];
let members: MemberResponseDto[];

const baseLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: '018f8de0-1111-7c71-bb64-347037ba9a57',
  tenantId: 'tenant-1',
  contactId,
  listingId,
  userId: agentId,
  stage: LeadStages.QUALIFIED,
  source: LeadSources.MANUAL_ENTRY,
  isActive: true,
  nextTask: 'Confirm budget and timeline',
  dueAt: null,
  listingValue: 875000,
  createdAt: '2026-09-14T05:15:00.000Z',
  updatedAt: '2026-09-14T05:15:00.000Z',
  ...overrides,
});

class FakeLeadRepository {
  find(options: LeadQueryOptions): Promise<{ data: Lead[]; total: number }> {
    let data = leads.filter((lead) => lead.tenantId === options.tenantId);

    if (options.stage === 'Qualified') {
      data = data.filter((lead) => lead.stage === LeadStages.QUALIFIED);
    }

    if (options.source === 'Website,Referral') {
      data = data.filter((lead) =>
        [LeadSources.WEBSITE, LeadSources.REFERRAL].includes(lead.source),
      );
    }

    if (options.userId) {
      const userIds = options.userId.split(',');
      data = data.filter((lead) => userIds.includes(lead.userId));
    }

    if (options.isActive === 'inactive') {
      data = data.filter((lead) => !lead.isActive);
    }

    if (options.search) {
      const needle = options.search.toLowerCase();
      data = data.filter((lead) => {
        const contact = contacts.find((item) => item.id === lead.contactId);
        const listing = listings.find((item) => item.id === lead.listingId);
        const member = members.find((item) => item.id === lead.userId);

        return [
          lead.nextTask,
          contact?.first_name,
          listing?.title,
          member?.name,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      });
    }

    const total = data.length;
    const start = (options.page - 1) * options.perPage;

    return Promise.resolve({
      data: data.slice(start, start + options.perPage),
      total,
    });
  }

  findById(tenantId: string, id: string): Promise<Lead | null> {
    return Promise.resolve(
      leads.find((lead) => lead.tenantId === tenantId && lead.id === id) ??
        null,
    );
  }

  create(data: LeadCreateInput): Promise<Lead> {
    const listing = listings.find((item) => item.id === data.listingId);
    const lead = baseLead({
      id: `018f8de0-2222-7c71-bb64-347037ba9a5${leads.length}`,
      tenantId: data.tenantId,
      contactId: data.contactId,
      listingId: data.listingId,
      userId: data.userId,
      stage: data.stage ?? LeadStages.NEW_LEAD,
      source: data.source ?? LeadSources.MANUAL_ENTRY,
      isActive: data.isActive ?? true,
      nextTask: data.nextTask ?? null,
      dueAt: data.dueAt ?? null,
      listingValue: listing?.price ?? 0,
    });

    leads.push(lead);

    return Promise.resolve(lead);
  }

  update(
    tenantId: string,
    id: string,
    data: LeadUpdateInput,
  ): Promise<Lead | null> {
    const index = leads.findIndex(
      (lead) => lead.tenantId === tenantId && lead.id === id,
    );

    if (index === -1) {
      return Promise.resolve(null);
    }

    const nextListingId = data.listingId ?? leads[index].listingId;
    const listing = listings.find((item) => item.id === nextListingId);

    leads[index] = {
      ...leads[index],
      ...(data.contactId !== undefined ? { contactId: data.contactId } : {}),
      ...(data.listingId !== undefined ? { listingId: data.listingId } : {}),
      ...(data.userId !== undefined ? { userId: data.userId } : {}),
      ...(data.stage !== undefined ? { stage: data.stage ?? 0 } : {}),
      ...(data.source !== undefined ? { source: data.source ?? 0 } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.nextTask !== undefined ? { nextTask: data.nextTask } : {}),
      ...(data.dueAt !== undefined ? { dueAt: data.dueAt } : {}),
      listingValue: listing?.price ?? 0,
    };

    return Promise.resolve(leads[index]);
  }

  updateStage(
    tenantId: string,
    id: string,
    stage: number,
  ): Promise<Lead | null> {
    return this.update(tenantId, id, { stage });
  }
}

class FakeContactService {
  findContactsByIds(
    tenantId: string,
    ids: string[],
  ): Promise<ContactResponseDto[]> {
    return Promise.resolve(
      contacts.filter(
        (contact) => contact.tenant_id === tenantId && ids.includes(contact.id),
      ),
    );
  }

  contactsBelongToTenant(tenantId: string, ids: string[]): Promise<boolean> {
    return Promise.resolve(
      ids.every((id) =>
        contacts.some(
          (contact) => contact.tenant_id === tenantId && contact.id === id,
        ),
      ),
    );
  }
}

class FakeListingService {
  findListingsByIds(
    tenantId: string,
    ids: string[],
  ): Promise<ListingResponseDto[]> {
    return Promise.resolve(
      listings.filter(
        (listing) => listing.tenant_id === tenantId && ids.includes(listing.id),
      ),
    );
  }

  listingsBelongToTenant(tenantId: string, ids: string[]): Promise<boolean> {
    return Promise.resolve(
      ids.every((id) =>
        listings.some(
          (listing) => listing.tenant_id === tenantId && listing.id === id,
        ),
      ),
    );
  }

  markListingSold(tenantId: string, id: string): Promise<void> {
    listings = listings.map((listing) =>
      listing.tenant_id === tenantId && listing.id === id
        ? { ...listing, status: 4 }
        : listing,
    );

    return Promise.resolve();
  }
}

class FakeUserService {
  userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    return Promise.resolve(
      members.some((user) => user.tenant_id === tenantId && user.id === userId),
    );
  }

  findMembersByIds(
    tenantId: string,
    ids: string[],
  ): Promise<MemberResponseDto[]> {
    return Promise.resolve(
      members.filter(
        (user) => user.tenant_id === tenantId && ids.includes(user.id),
      ),
    );
  }
}

class FakeActivityService {
  recordLeadCreated(): Promise<void> {
    return Promise.resolve();
  }

  recordLeadUpdated(): Promise<void> {
    return Promise.resolve();
  }
}

describe('LeadController API', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    contacts = [
      {
        id: contactId,
        tenant_id: 'tenant-1',
        owner_id: agentId,
        first_name: 'Ethan',
        last_name: 'Miller',
        email: 'ethan.lead@example.com',
        phone: '+62812345678',
        status: true,
        status_label: 'Active',
        budget: 500000,
        source_id: 1,
        source: 'Website',
        last_contacted_at: '2026-05-30T00:00:00.000Z',
        created_at: '2026-09-14T05:15:00.000Z',
      },
      {
        id: inactiveContactId,
        tenant_id: 'tenant-1',
        owner_id: agentId,
        first_name: 'Inactive',
        last_name: 'Client',
        email: 'inactive@example.com',
        phone: null,
        status: false,
        status_label: 'Inactive',
        budget: null,
        source_id: 1,
        source: 'Website',
        last_contacted_at: null,
        created_at: '2026-09-14T05:15:00.000Z',
      },
      {
        id: outsideContactId,
        tenant_id: 'tenant-2',
        owner_id: outsideAgentId,
        first_name: 'Outside',
        last_name: 'Client',
        email: 'outside@example.com',
        phone: null,
        status: true,
        status_label: 'Active',
        budget: null,
        source_id: 1,
        source: 'Website',
        last_contacted_at: null,
        created_at: '2026-09-14T05:15:00.000Z',
      },
    ];
    listings = [
      {
        id: listingId,
        tenant_id: 'tenant-1',
        title: 'Harbor View Residence',
        address: '18 Harbor Lane, Westport',
        price: 875000,
        status: 1,
        bedrooms: 4,
        bathrooms: 3,
        property_type: 1,
        created_at: '2026-09-14T05:15:00.000Z',
      },
      {
        id: soldListingId,
        tenant_id: 'tenant-1',
        title: 'Sold Loft',
        address: '44 City Center',
        price: 645000,
        status: 4,
        bedrooms: 2,
        bathrooms: 2,
        property_type: 4,
        created_at: '2026-09-14T05:15:00.000Z',
      },
      {
        id: outsideListingId,
        tenant_id: 'tenant-2',
        title: 'Outside Estate',
        address: '9 Elsewhere',
        price: 900000,
        status: 1,
        bedrooms: 4,
        bathrooms: 3,
        property_type: 1,
        created_at: '2026-09-14T05:15:00.000Z',
      },
    ];
    members = [
      {
        id: agentId,
        tenant_id: 'tenant-1',
        role: Roles.SALES,
        roles: [Roles.SALES],
        direct_permissions: [],
        name: 'Maya Agent',
        email: 'maya.agent@example.com',
        created_at: '2026-09-14T05:15:00.000Z',
      },
      {
        id: otherAgentId,
        tenant_id: 'tenant-1',
        role: Roles.SALES,
        roles: [Roles.SALES],
        direct_permissions: [],
        name: 'Noah Agent',
        email: 'noah.agent@example.com',
        created_at: '2026-09-14T05:15:00.000Z',
      },
      {
        id: outsideAgentId,
        tenant_id: 'tenant-2',
        role: Roles.SALES,
        roles: [Roles.SALES],
        direct_permissions: [],
        name: 'Outside Agent',
        email: 'outside.agent@example.com',
        created_at: '2026-09-14T05:15:00.000Z',
      },
    ];
    leads = [
      baseLead(),
      baseLead({
        id: '018f8de0-1111-7c71-bb64-347037ba9a58',
        userId: otherAgentId,
        stage: LeadStages.CONTACTED,
        source: LeadSources.WEBSITE,
      }),
      baseLead({
        id: '018f8de0-1111-7c71-bb64-347037ba9a59',
        tenantId: 'tenant-2',
      }),
    ];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LeadController],
      providers: [
        Reflector,
        RbacGuard,
        LeadService,
        {
          provide: LeadRepository,
          useClass: FakeLeadRepository,
        },
        {
          provide: ActivityService,
          useClass: FakeActivityService,
        },
        {
          provide: ContactService,
          useClass: FakeContactService,
        },
        {
          provide: ListingService,
          useClass: FakeListingService,
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
          request.user =
            token === 'viewer-token'
              ? viewerUser
              : token === 'assign-self-token'
                ? assignSelfUser
                : token === 'update-token'
                  ? updateUser
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

  it('requires authentication for lead resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/leads')
      .expect(401)
      .expect({ message: 'Unauthenticated.' });
  });

  it('blocks tenant header crossover for lead resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/leads')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-2')
      .expect(403);
  });

  it('lists paginated leads without relations by default', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/leads?page=1&per_page=1&search=Harbor')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          id: '018f8de0-1111-7c71-bb64-347037ba9a57',
          tenant_id: 'tenant-1',
          stage: 'Qualified',
          source_id: 0,
          source: 'Manual Entry',
          is_active: true,
          value: 875000,
        });
        expect(response.body.data[0].contact).toBeUndefined();
        expect(response.body.data[0].listing).toBeUndefined();
        expect(response.body.data[0].user).toBeUndefined();
      });
  });

  it('filters leads and includes requested relations', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get(
        `/api/v1/leads?filter[user_id]=${agentId},${otherAgentId}&filter[source]=Website,Referral&include[]=contact&include[]=listing&include[]=user`,
      )
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].contact.email).toBe(
          'ethan.lead@example.com',
        );
        expect(response.body.data[0].listing.title).toBe(
          'Harbor View Residence',
        );
        expect(response.body.data[0].user.name).toBe('Noah Agent');
      });
  });

  it('creates a lead with readable stage and derived listing value', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/leads')
      .set('Authorization', 'Bearer assign-self-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        contact_id: contactId,
        listing_id: listingId,
        user_id: agentId,
        stage: 'Qualified',
        next_task: 'Confirm budget and timeline',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          tenant_id: 'tenant-1',
          contact_id: contactId,
          listing_id: listingId,
          user_id: agentId,
          stage: 'Qualified',
          source_id: 0,
          source: 'Manual Entry',
          is_active: true,
          value: 875000,
        });
      });
  });

  it('requires assignment permission when creating for another user', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .post('/api/v1/leads')
      .set('Authorization', 'Bearer assign-self-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        contact_id: contactId,
        listing_id: listingId,
        user_id: otherAgentId,
      })
      .expect(403);

    await request(server)
      .post('/api/v1/leads')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        contact_id: contactId,
        listing_id: listingId,
        user_id: otherAgentId,
      })
      .expect(201);
  });

  it('updates stage and marks Closed Won listings sold', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .patch('/api/v1/leads/018f8de0-1111-7c71-bb64-347037ba9a57/stage')
      .set('Authorization', 'Bearer update-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ stage: 'Closed Won' })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.stage).toBe('Closed Won');
        expect(
          listings.find((listing) => listing.id === listingId)?.status,
        ).toBe(4);
      });
  });

  it('prevents closed leads from moving to another stage', () => {
    leads[0] = baseLead({ stage: LeadStages.CLOSED_LOST });
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .patch('/api/v1/leads/018f8de0-1111-7c71-bb64-347037ba9a57/stage')
      .set('Authorization', 'Bearer update-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ stage: 'Negotiating' })
      .expect(422)
      .expect((response) => {
        expect(response.body.errors.stage).toEqual([
          'Closed lead cards cannot move to another stage.',
        ]);
      });
  });

  it('lets blocked leads change active status only', async () => {
    leads[0] = baseLead({ contactId: inactiveContactId });
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .patch('/api/v1/leads/018f8de0-1111-7c71-bb64-347037ba9a57')
      .set('Authorization', 'Bearer update-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ stage: 'Negotiating' })
      .expect(422)
      .expect((response) => {
        expect(response.body.errors.lead).toEqual([
          'Lead cards with a sold listing or inactive contact can only change active status.',
        ]);
      });

    await request(server)
      .patch('/api/v1/leads/018f8de0-1111-7c71-bb64-347037ba9a57')
      .set('Authorization', 'Bearer update-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ is_active: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.is_active).toBe(false);
      });
  });

  it('rejects relation ids outside the tenant', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/leads')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        contact_id: outsideContactId,
        listing_id: outsideListingId,
        user_id: outsideAgentId,
      })
      .expect(422)
      .expect((response) => {
        expect(response.body.errors.contact_id).toEqual([
          'The selected contact id is invalid.',
        ]);
        expect(response.body.errors.listing_id).toEqual([
          'The selected listing id is invalid.',
        ]);
        expect(response.body.errors.user_id).toEqual([
          'The selected user id is invalid.',
        ]);
      });
  });
});
