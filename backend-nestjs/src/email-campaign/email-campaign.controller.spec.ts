/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
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
import { AuthGuard } from '../auth/auth.guard.js';
import { ContactService } from '../contact/contact.service.js';
import { ListingService } from '../listing/listing.service.js';
import { Permissions, Roles } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { UserService } from '../user/user.service.js';
import { CampaignEmailRenderer } from './campaign-email.renderer.js';
import { MailEmailSender } from './campaign-email.sender.js';
import { EmailCampaignController } from './email-campaign.controller.js';
import {
  EMAIL_CAMPAIGN_QUEUE,
  EmailCampaignService,
} from './email-campaign.service.js';
import {
  EmailCampaignQueryOptions,
  EmailCampaignRepository,
  QueueEmailCampaignInput,
} from './email-campaign.repository.js';
import { EmailCampaign } from './email-campaign.type.js';

const tenantId = '018f8de0-61ef-7c71-bf36-1513b7d6db46';
const otherTenantId = '018f8de0-61ef-7c71-bf36-1513b7d6db47';
const contactId = '018f8de0-7424-7c71-a0f9-14d364f50d84';
const secondContactId = '018f8de0-7424-7c71-a0f9-14d364f50d85';
const inactiveContactId = '018f8de0-7424-7c71-a0f9-14d364f50d86';
const userId = '018f8de0-7424-7c71-a0f9-14d364f50d87';
const listingId = '018f8de0-7424-7c71-a0f9-14d364f50d88';

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  tenant_id: tenantId,
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [
    Permissions.EMAIL_CAMPAIGNS_VIEW,
    Permissions.EMAIL_CAMPAIGNS_CREATE,
  ],
  name: 'Maya Admin',
  email: 'maya.admin@example.test',
};

const viewerUser: AuthenticatedUser = {
  ...adminUser,
  id: 'viewer-1',
  permissions: [Permissions.EMAIL_CAMPAIGNS_VIEW],
  name: 'Viewer Agent',
  email: 'viewer@example.test',
};

let campaigns: EmailCampaign[];
let queuedCampaignIds: string[];
let emittedEvents: Array<{ event: string; payload: unknown }>;

const baseCampaign = (
  overrides: Partial<EmailCampaign> = {},
): EmailCampaign => ({
  id: 'campaign-1',
  tenantId,
  userId,
  listingId: null,
  subject: 'Open house follow-up',
  body: 'Thanks for visiting.',
  contactIds: [contactId],
  recipientCount: 1,
  status: 'Queued',
  createdAt: '2026-09-14T05:15:00.000Z',
  updatedAt: '2026-09-14T05:15:00.000Z',
  ...overrides,
});

class FakeEmailCampaignRepository {
  find(
    options: EmailCampaignQueryOptions,
  ): Promise<{ data: EmailCampaign[]; total: number }> {
    let data = campaigns.filter(
      (campaign) => campaign.tenantId === options.tenantId,
    );

    if (options.status) {
      data = data.filter((campaign) => campaign.status === options.status);
    }

    if (options.search) {
      data = data.filter((campaign) =>
        campaign.subject.toLowerCase().includes(options.search!.toLowerCase()),
      );
    }

    const start = (options.page - 1) * options.perPage;

    return Promise.resolve({
      data: data.slice(start, start + options.perPage),
      total: data.length,
    });
  }

  createQueued(data: QueueEmailCampaignInput): Promise<EmailCampaign> {
    const campaign = baseCampaign({
      id: `campaign-${campaigns.length + 1}`,
      tenantId: data.tenantId,
      userId: data.userId ?? null,
      listingId: data.listingId ?? null,
      subject: data.subject,
      body: data.body,
      contactIds: data.contactIds,
      recipientCount: data.contactIds.length,
      status: 'Queued',
    });

    campaigns.push(campaign);

    return Promise.resolve(campaign);
  }
}

class FakeContactService {
  contactsBelongToTenant(
    _tenantId: string,
    contactIds: string[],
  ): Promise<boolean> {
    return Promise.resolve(
      contactIds.every((id) =>
        [contactId, secondContactId, inactiveContactId].includes(id),
      ),
    );
  }

  findContactsByIds(_tenantId: string, contactIds: string[]) {
    return Promise.resolve(
      contactIds.map((id) => ({
        id,
        tenant_id: tenantId,
        owner_id: null,
        first_name: 'Nadia',
        last_name: 'Stone',
        email: 'nadia@example.test',
        phone: null,
        status: id !== inactiveContactId,
        status_label: id === inactiveContactId ? 'Inactive' : 'Active',
        budget: null,
        source_id: null,
        source: null,
        last_contacted_at: null,
        created_at: '2026-09-14T05:15:00.000Z',
      })),
    );
  }
}

class FakeListingService {
  listingsBelongToTenant(
    _tenantId: string,
    listingIds: string[],
  ): Promise<boolean> {
    return Promise.resolve(listingIds.every((id) => id === listingId));
  }
}

class FakeUserService {
  userBelongsToTenant(
    userIdToCheck: string,
    tenantIdToCheck: string,
  ): Promise<boolean> {
    return Promise.resolve(
      userIdToCheck === userId && tenantIdToCheck === tenantId,
    );
  }
}

class FakeEmailCampaignQueue {
  enqueueCampaign(campaignId: string): Promise<void> {
    queuedCampaignIds.push(campaignId);
    return Promise.resolve();
  }

  enqueueContact(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeEventEmitter {
  emitAsync(event: string, payload: unknown): Promise<unknown[]> {
    emittedEvents.push({ event, payload });
    return Promise.resolve([]);
  }
}

class FakeEmailSender {
  send(): Promise<void> {
    return Promise.resolve();
  }
}

describe('EmailCampaignController API', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    campaigns = [
      baseCampaign(),
      baseCampaign({
        id: 'campaign-2',
        subject: 'September newsletter',
        status: 'Sent',
        recipientCount: 2,
      }),
      baseCampaign({
        id: 'outside-campaign',
        tenantId: otherTenantId,
        subject: 'Outside tenant',
      }),
    ];
    queuedCampaignIds = [];
    emittedEvents = [];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EmailCampaignController],
      providers: [
        Reflector,
        RbacGuard,
        EmailCampaignService,
        CampaignEmailRenderer,
        {
          provide: EmailCampaignRepository,
          useClass: FakeEmailCampaignRepository,
        },
        {
          provide: EMAIL_CAMPAIGN_QUEUE,
          useClass: FakeEmailCampaignQueue,
        },
        {
          provide: EventEmitter2,
          useClass: FakeEventEmitter,
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
        {
          provide: MailEmailSender,
          useClass: FakeEmailSender,
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

  it('lists tenant-scoped email campaigns with Laravel-style pagination', () => {
    return request(app.getHttpServer())
      .get('/api/v1/email-campaigns?filter[status]=Sent')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', tenantId)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          id: 'campaign-2',
          tenant_id: tenantId,
          subject: 'September newsletter',
          recipient_count: 2,
          status: 'Sent',
          created_at: '2026-09-14T05:15:00.000Z',
        });
        expect(response.body.meta.total).toBe(1);
        expect(response.body.links.first).toContain('/api/v1/email-campaigns?');
      });
  });

  it('accepts a bulk email for queueing', () => {
    return request(app.getHttpServer())
      .post('/api/v1/bulk-emails')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', tenantId)
      .send({
        user_id: userId,
        listing_id: listingId,
        contact_ids: [contactId, secondContactId],
        subject: 'Open house follow-up',
        body: 'Thanks for visiting our open house.',
      })
      .expect(202)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          tenant_id: tenantId,
          user_id: userId,
          listing_id: listingId,
          subject: 'Open house follow-up',
          recipient_count: 2,
          status: 'Queued',
        });
        expect(queuedCampaignIds).toEqual([response.body.data.id]);
        expect(emittedEvents[0].event).toBe(
          ActivityEvents.EMAIL_CAMPAIGN_CREATED,
        );
      });
  });

  it('rejects inactive included contacts for all-active campaigns', () => {
    return request(app.getHttpServer())
      .post('/api/v1/bulk-emails')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', tenantId)
      .send({
        all_active_contacts: true,
        included_contact_ids: [inactiveContactId],
        subject: 'Open house follow-up',
        body: 'Thanks for visiting our open house.',
      })
      .expect(422)
      .expect((response) => {
        expect(response.body.message).toBe(
          'Only active contacts can be selected for an active bulk email.',
        );
      });
  });

  it('blocks tenant header crossover for email campaigns', () => {
    return request(app.getHttpServer())
      .get('/api/v1/email-campaigns')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', otherTenantId)
      .expect(403);
  });

  it('forbids create when the token only has view permission', () => {
    return request(app.getHttpServer())
      .post('/api/v1/bulk-emails')
      .set('Authorization', 'Bearer viewer-token')
      .set('X-Tenant-Id', tenantId)
      .send({
        contact_ids: [contactId],
        subject: 'Open house follow-up',
        body: 'Thanks for visiting our open house.',
      })
      .expect(403);
  });
});
