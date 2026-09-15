/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ActivityEvents } from '../activity/activity.events.js';
import { ActivityLog } from '../activity/activity.type.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { Contact } from '../contact/contact.type.js';
import { LeadStages, LeadSources } from '../lead/lead.constants.js';
import { Lead } from '../lead/lead.type.js';
import { Listing } from '../listing/listing.type.js';
import { Permissions, Roles } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { User } from '../user/user.type.js';
import { ReportingController } from './reporting.controller.js';
import { ReportingRepository } from './reporting.repository.js';
import { ReportingService } from './reporting.service.js';
import { ReportingSnapshot } from './reporting.type.js';

const tenantId = 'tenant-1';
const otherTenantId = 'tenant-2';
const agentId = '018f8de0-6aba-7c71-b65d-95302af6be84';
const otherAgentId = '018f8de0-6aba-7c71-b65d-95302af6be85';
const contactId = '018f8de0-7424-7c71-a0f9-14d364f50d84';
const inactiveContactId = '018f8de0-7424-7c71-a0f9-14d364f50d85';
const listingId = '018f8de0-7f2d-7c71-bb64-347037ba9a57';
const openListingId = '018f8de0-7f2d-7c71-bb64-347037ba9a58';

const reportUser: AuthenticatedUser = {
  id: agentId,
  tenant_id: tenantId,
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [Permissions.REPORTS_VIEW],
  name: 'Maya Admin',
  email: 'maya.admin@example.test',
};

const noReportUser: AuthenticatedUser = {
  ...reportUser,
  permissions: [],
};

let snapshot: ReportingSnapshot;
let exportAudit: {
  event: string | string[];
  payload: Record<string, unknown>;
}[];

class FakeReportingRepository {
  snapshot(requestedTenantId: string): Promise<ReportingSnapshot> {
    return Promise.resolve({
      contacts: snapshot.contacts.filter(
        (contact) => contact.tenantId === requestedTenantId,
      ),
      leads: snapshot.leads.filter(
        (lead) => lead.tenantId === requestedTenantId,
      ),
      listings: snapshot.listings.filter(
        (listing) => listing.tenantId === requestedTenantId,
      ),
      users: snapshot.users.filter(
        (user) => user.tenantId === requestedTenantId,
      ),
      activityLogs: snapshot.activityLogs.filter(
        (activityLog) => activityLog.tenantId === requestedTenantId,
      ),
    });
  }
}

class FakeEventEmitter {
  emitAsync(
    event: string | string[],
    payload: Record<string, unknown>,
  ): Promise<unknown[]> {
    exportAudit.push({
      event,
      payload,
    });

    return Promise.resolve([]);
  }
}

describe('ReportingController API', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    exportAudit = [];
    snapshot = {
      contacts: [
        contact({
          id: contactId,
          ownerId: agentId,
          firstName: 'Ethan',
          lastName: 'Miller',
          status: true,
          source: 4,
          lastContactedAt: '2026-09-01T00:00:00.000Z',
        }),
        contact({
          id: inactiveContactId,
          ownerId: otherAgentId,
          firstName: 'Rina',
          lastName: 'Cole',
          email: 'rina@example.test',
          status: false,
          source: 1,
          lastContactedAt: null,
        }),
        contact({ id: 'outside-contact', tenantId: otherTenantId }),
      ],
      listings: [
        listing({
          id: listingId,
          title: 'Canal Villa',
          price: 1200000,
          status: 4,
        }),
        listing({
          id: openListingId,
          title: 'Garden Apartment',
          price: 500000,
          status: 1,
        }),
        listing({ id: 'outside-listing', tenantId: otherTenantId }),
      ],
      users: [
        user({ id: agentId, name: 'Maya Agent' }),
        user({ id: otherAgentId, name: 'Noah Agent' }),
        user({ id: 'outside-user', tenantId: otherTenantId }),
      ],
      leads: [
        lead({
          id: 'closed-won-lead',
          contactId,
          listingId,
          userId: agentId,
          stage: LeadStages.CLOSED_WON,
          source: LeadSources.REFERRAL,
        }),
        lead({
          id: 'open-lead-one',
          contactId,
          listingId: openListingId,
          userId: agentId,
          stage: LeadStages.NEW_LEAD,
          source: LeadSources.WEBSITE,
          nextTask: 'Confirm goals',
        }),
        lead({
          id: 'open-lead-two',
          contactId,
          listingId: openListingId,
          userId: agentId,
          stage: LeadStages.NEW_LEAD,
          source: LeadSources.WEBSITE,
        }),
        lead({ id: 'outside-lead', tenantId: otherTenantId }),
      ],
      activityLogs: [
        activityLog({
          id: 'contact-activity',
          userId: agentId,
          actionType: 'contact.updated',
          description: 'Updated contact Ethan Miller.',
        }),
        activityLog({
          id: 'listing-activity',
          actionType: 'listing.updated',
          description: 'Updated listing.',
        }),
      ],
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        Reflector,
        RbacGuard,
        ReportingService,
        {
          provide: ReportingRepository,
          useClass: FakeReportingRepository,
        },
        {
          provide: EventEmitter2,
          useClass: FakeEventEmitter,
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
            token === 'no-report-token' ? noReportUser : reportUser;
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

  it('requires authentication for reporting resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/reports')
      .expect(401)
      .expect({ message: 'Unauthenticated.' });
  });

  it('requires reports.view permission', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/reports')
      .set('Authorization', 'Bearer no-report-token')
      .set('X-Tenant-Id', tenantId)
      .expect(403);
  });

  it('blocks tenant header crossover for reporting resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/reports')
      .set('Authorization', 'Bearer report-token')
      .set('X-Tenant-Id', otherTenantId)
      .expect(403);
  });

  it('returns the Laravel-compatible reporting overview', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/reports')
      .set('Authorization', 'Bearer report-token')
      .set('X-Tenant-Id', tenantId)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.reports).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'client-summary' }),
            expect.objectContaining({ key: 'financial-revenue' }),
          ]),
        );
        expect(response.body.data.dashboard).toMatchObject({
          new_leads: 1,
          pending_tasks: 1,
          lead_value: 1700000,
          win_rate: 100,
          executive: {
            total_active_clients: 1,
            revenue: 1200000,
            pipeline_value: 500000,
          },
        });
      });
  });

  it('returns paginated report rows with tenant-scoped report data', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/reports/client-summary/rows?sort=client&direction=asc')
      .set('Authorization', 'Bearer report-token')
      .set('X-Tenant-Id', tenantId)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0]).toMatchObject({
          client: 'Ethan Miller',
          owner: 'Maya Agent',
          source: 'Referral',
          open_leads: 2,
          won_leads: 1,
          pipeline_value: 500000,
        });
        expect(response.body.meta.total).toBe(2);
      });
  });

  it('returns 404 for unknown reports', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/reports/unknown/rows')
      .set('Authorization', 'Bearer report-token')
      .set('X-Tenant-Id', tenantId)
      .expect(404);
  });

  it('exports CSV and audits the export', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .get('/api/v1/reports/financial-revenue/export?format=csv')
      .set('Authorization', 'Bearer report-token')
      .set('X-Tenant-Id', tenantId)
      .expect(200)
      .expect('Content-Type', /text\/csv/)
      .expect((response) => {
        expect(response.text).toContain('"Client","Listing","Owner"');
        expect(response.text).toContain('"Ethan Miller","Canal Villa"');
      });

    expect(exportAudit).toEqual([
      expect.objectContaining({
        event: ActivityEvents.REPORT_EXPORTED,
        payload: expect.objectContaining({
          tenantId,
          userId: agentId,
          reportName: 'Revenue Report',
          properties: expect.objectContaining({
            report_key: 'financial-revenue',
            format: 'csv',
            rows: 3,
          }),
        }),
      }),
    ]);
  });

  it('rejects future export formats until their pipelines exist', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/reports/client-summary/export?format=pdf')
      .set('Authorization', 'Bearer report-token')
      .set('X-Tenant-Id', tenantId)
      .expect(422);
  });
});

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'contact-id',
    tenantId,
    ownerId: null,
    firstName: 'Default',
    lastName: 'Client',
    email: 'client@example.test',
    phone: null,
    status: true,
    budget: null,
    source: 0,
    lastContactedAt: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-09-14T05:15:00.000Z',
    updatedAt: '2026-09-14T05:15:00.000Z',
    ...overrides,
  };
}

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-id',
    tenantId,
    title: 'Default Listing',
    address: '100 Harbor Lane',
    price: 100000,
    status: 1,
    bedrooms: 2,
    bathrooms: 2,
    propertyType: 1,
    createdAt: '2026-09-14T05:15:00.000Z',
    updatedAt: '2026-09-14T05:15:00.000Z',
    ...overrides,
  };
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    tenantId,
    role: Roles.SALES,
    name: 'Default User',
    email: 'user@example.test',
    createdAt: '2026-09-14T05:15:00.000Z',
    updatedAt: '2026-09-14T05:15:00.000Z',
    ...overrides,
  };
}

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-id',
    tenantId,
    contactId,
    listingId,
    userId: agentId,
    stage: LeadStages.NEW_LEAD,
    source: LeadSources.MANUAL_ENTRY,
    isActive: true,
    nextTask: null,
    dueAt: null,
    createdAt: '2026-09-14T05:15:00.000Z',
    updatedAt: '2026-09-14T05:15:00.000Z',
    ...overrides,
  };
}

function activityLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  return {
    id: 'activity-id',
    tenantId,
    userId: null,
    userName: null,
    actionType: 'contact.created',
    description: 'Created a contact.',
    properties: null,
    createdAt: '2026-09-14T05:15:00.000Z',
    updatedAt: '2026-09-14T05:15:00.000Z',
    ...overrides,
  };
}
