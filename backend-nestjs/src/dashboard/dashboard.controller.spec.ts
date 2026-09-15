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
import { AuthGuard } from '../auth/auth.guard.js';
import { Contact } from '../contact/contact.type.js';
import { LeadStages, LeadSources } from '../lead/lead.constants.js';
import { Lead } from '../lead/lead.type.js';
import { Listing } from '../listing/listing.type.js';
import { Permissions, Roles } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { ReportingRepository } from '../reporting/reporting.repository.js';
import { ReportingService } from '../reporting/reporting.service.js';
import { ReportingSnapshot } from '../reporting/reporting.type.js';
import { User } from '../user/user.type.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

const tenantId = 'tenant-1';
const otherTenantId = 'tenant-2';
const agentId = '018f8de0-6aba-7c71-b65d-95302af6be84';
const contactId = '018f8de0-7424-7c71-a0f9-14d364f50d84';
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
  emitAsync(): Promise<unknown[]> {
    return Promise.resolve([]);
  }
}

describe('DashboardController API', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    snapshot = {
      contacts: [
        contact({
          id: contactId,
          ownerId: agentId,
          firstName: 'Ethan',
          lastName: 'Miller',
          status: true,
        }),
        contact({
          id: 'outside-contact',
          tenantId: otherTenantId,
        }),
      ],
      listings: [
        listing({
          id: listingId,
          title: 'Canal Villa',
          price: 1200000,
        }),
        listing({
          id: openListingId,
          title: 'Garden Apartment',
          price: 500000,
        }),
        listing({ id: 'outside-listing', tenantId: otherTenantId }),
      ],
      users: [
        user({ id: agentId, name: 'Maya Agent' }),
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
          id: 'open-lead',
          contactId,
          listingId: openListingId,
          userId: agentId,
          stage: LeadStages.NEW_LEAD,
          source: LeadSources.WEBSITE,
          nextTask: 'Confirm goals',
        }),
        lead({
          id: 'outside-lead',
          tenantId: otherTenantId,
        }),
      ],
      activityLogs: [],
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        Reflector,
        RbacGuard,
        DashboardService,
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

  it('requires authentication for dashboard summary', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/dashboard')
      .expect(401)
      .expect({ message: 'Unauthenticated.' });
  });

  it('requires reports.view permission', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/dashboard')
      .set('Authorization', 'Bearer no-report-token')
      .set('X-Tenant-Id', tenantId)
      .expect(403);
  });

  it('blocks tenant crossover for dashboard summary', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/dashboard')
      .set('Authorization', 'Bearer report-token')
      .set('X-Tenant-Id', otherTenantId)
      .expect(403);
  });

  it('serves the Laravel-compatible dashboard summary from reporting data', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/dashboard')
      .set('Authorization', 'Bearer report-token')
      .set('X-Tenant-Id', tenantId)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          new_leads: 1,
          pending_tasks: 1,
          lead_value: 1700000,
          win_rate: 100,
          executive: {
            total_active_clients: 1,
            new_clients: 1,
            revenue: 1200000,
            pipeline_value: 500000,
          },
          available_filters: [
            'date_range',
            'client',
            'caregiver',
            'service_type',
          ],
          future_filters: ['branch', 'region'],
        });
      });
  });

  it('accepts the same dashboard filters as the Laravel API', () => {
    snapshot.leads.push(
      lead({
        id: 'old-closed-won-lead',
        contactId,
        listingId: openListingId,
        userId: agentId,
        stage: LeadStages.CLOSED_WON,
        source: LeadSources.WEBSITE,
        createdAt: '2026-01-01T05:15:00.000Z',
      }),
    );

    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/dashboard?filter[date_from]=2026-09-01')
      .set('Authorization', 'Bearer report-token')
      .set('X-Tenant-Id', tenantId)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.executive.revenue).toBe(1200000);
        expect(response.body.data.win_rate).toBe(100);
      });
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
