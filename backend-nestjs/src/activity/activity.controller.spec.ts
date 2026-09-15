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
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { ActivityController } from './activity.controller.js';
import {
  ActivityQueryOptions,
  ActivityRepository,
  ActivitySortKey,
} from './activity.repository.js';
import { ActivityService } from './activity.service.js';
import { ActivityLog } from './activity.type.js';

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  tenant_id: 'tenant-1',
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [Permissions.ACTIVITY_LOGS_VIEW],
  name: 'Maya Admin',
  email: 'maya.admin@example.test',
};

const unauthorizedUser: AuthenticatedUser = {
  ...adminUser,
  id: 'viewer-1',
  permissions: [],
  name: 'Viewer Agent',
  email: 'viewer@example.test',
};

let activityLogs: ActivityLog[];

const baseActivityLog = (
  overrides: Partial<ActivityLog> = {},
): ActivityLog => ({
  id: 'activity-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  userName: 'Nadia Stone',
  actionType: 'contact.updated',
  description: 'Updated contact Nadia Stone: email.',
  properties: {
    subject_type: 'contact',
    subject_id: 'contact-1',
    changes: {
      email: {
        old: 'nadia.old@example.com',
        new: 'nadia@example.com',
      },
    },
  },
  createdAt: '2026-09-14T05:15:00.000Z',
  updatedAt: '2026-09-14T05:15:00.000Z',
  ...overrides,
});

class FakeActivityRepository {
  find(
    options: ActivityQueryOptions,
  ): Promise<{ data: ActivityLog[]; total: number }> {
    let data = activityLogs.filter(
      (activityLog) => activityLog.tenantId === options.tenantId,
    );

    if (options.actionType) {
      data = data.filter(
        (activityLog) => activityLog.actionType === options.actionType,
      );
    }

    if (options.userId) {
      data = data.filter(
        (activityLog) => activityLog.userId === options.userId,
      );
    }

    if (options.search) {
      const needle = options.search.toLowerCase();
      data = data.filter((activityLog) =>
        [
          activityLog.actionType,
          activityLog.description,
          activityLog.userId,
          activityLog.userName,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }

    data = this.sort(data, options.sort, options.direction);
    const total = data.length;
    const start = (options.page - 1) * options.perPage;

    return Promise.resolve({
      data: data.slice(start, start + options.perPage),
      total,
    });
  }

  private sort(
    data: ActivityLog[],
    sort: ActivitySortKey,
    direction: 'asc' | 'desc',
  ): ActivityLog[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...data].sort((left, right) => {
      const leftValue = sort === 'action' ? left.actionType : left.createdAt;
      const rightValue = sort === 'action' ? right.actionType : right.createdAt;

      return leftValue.localeCompare(rightValue) * multiplier;
    });
  }
}

describe('ActivityController API', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    activityLogs = [
      baseActivityLog(),
      baseActivityLog({
        id: 'activity-2',
        userId: null,
        userName: null,
        actionType: 'listing.created',
        description: 'Created listing Harbor View Residence.',
        properties: {
          subject_type: 'listing',
          subject_id: 'listing-1',
          attributes: { title: 'Harbor View Residence' },
        },
        createdAt: '2026-09-15T05:15:00.000Z',
      }),
      baseActivityLog({
        id: 'activity-3',
        tenantId: 'tenant-2',
        actionType: 'contact.updated',
      }),
    ];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        Reflector,
        RbacGuard,
        ActivityService,
        {
          provide: ActivityRepository,
          useClass: FakeActivityRepository,
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
            token === 'unauthorized-token' ? unauthorizedUser : adminUser;
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

  it('requires authentication for activity logs', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/activity-logs')
      .expect(401)
      .expect({ message: 'Unauthenticated.' });
  });

  it('requires activity log view permission', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/activity-logs')
      .set('Authorization', 'Bearer unauthorized-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(403);
  });

  it('blocks tenant header crossover for activity logs', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/activity-logs')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-2')
      .expect(403);
  });

  it('lists paginated activity logs with Laravel response fields', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/activity-logs?page=1&per_page=1&search=nadia')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          id: 'activity-1',
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          user_name: 'Nadia Stone',
          action_type: 'contact.updated',
          description: 'Updated contact Nadia Stone: email.',
          properties: {
            subject_type: 'contact',
            subject_id: 'contact-1',
          },
          created_at: '2026-09-14T05:15:00.000Z',
        });
        expect(response.body.meta).toMatchObject({
          current_page: 1,
          per_page: 1,
          total: 1,
        });
      });
  });

  it('supports action and user filters', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get(
        '/api/v1/activity-logs?filter[action_type]=contact.updated&filter[user_id]=user-1',
      )
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        const body = response.body as { data: Array<{ id: string }> };

        expect(body.data.map((activityLog) => activityLog.id)).toEqual([
          'activity-1',
        ]);
      });
  });
});
