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
import { Permissions, Roles } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { MemberResponseDto } from '../user/user.dto.js';
import { UserService } from '../user/user.service.js';
import { ListingController } from './listing.controller.js';
import {
  ListingCreateInput,
  ListingInclude,
  ListingRepository,
  ListingSortKey,
  ListingUpdateInput,
} from './listing.repository.js';
import { ListingService } from './listing.service.js';
import { Listing, ListingDocument, ListingUserLink } from './listing.type.js';

const contactId = '018f8de0-7424-7c71-a0f9-14d364f50d84';
const outsideContactId = '018f8de0-7424-7c71-a0f9-14d364f50d85';
const primaryAgentId = '018f8de0-7424-7c71-a0f9-14d364f50d86';
const secondaryAgentId = '018f8de0-7424-7c71-a0f9-14d364f50d87';
const outsideAgentId = '018f8de0-7424-7c71-a0f9-14d364f50d88';

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  tenant_id: 'tenant-1',
  role: Roles.OFFICE_ADMIN,
  roles: [Roles.OFFICE_ADMIN],
  permissions: [
    Permissions.LISTINGS_VIEW,
    Permissions.LISTINGS_CREATE,
    Permissions.LISTINGS_UPDATE,
  ],
  name: 'Maya Admin',
  email: 'maya.admin@example.test',
};

const viewerUser: AuthenticatedUser = {
  ...adminUser,
  id: 'viewer-1',
  permissions: [Permissions.LISTINGS_VIEW],
  name: 'Viewer Agent',
  email: 'viewer@example.test',
};

let listings: Listing[];
let listingContacts: Record<string, string[]>;
let listingUsers: Record<string, ListingUserLink[]>;
let listingDocuments: Record<string, ListingDocument[]>;

const baseListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 'listing-1',
  tenantId: 'tenant-1',
  title: 'Harbor View Residence',
  address: '18 Harbor Lane, Westport',
  price: '875000.00',
  status: 1,
  bedrooms: 4,
  bathrooms: 3,
  propertyType: 1,
  createdAt: '2026-09-14T05:15:00.000Z',
  updatedAt: '2026-09-14T05:15:00.000Z',
  ...overrides,
});

class FakeListingRepository {
  find(options: {
    tenantId: string;
    search?: string;
    status?: string;
    propertyType?: string;
    includes: ListingInclude[];
    sort: ListingSortKey;
    direction: 'asc' | 'desc';
    page: number;
    perPage: number;
  }): Promise<{ data: Listing[]; total: number }> {
    let data = listings.filter(
      (listing) => listing.tenantId === options.tenantId,
    );

    if (options.search) {
      const needle = options.search.toLowerCase();
      data = data.filter((listing) =>
        [listing.title, listing.address]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }

    if (options.status) {
      data = data.filter(
        (listing) => listing.status === Number(options.status),
      );
    }

    if (options.propertyType) {
      data = data.filter(
        (listing) => listing.propertyType === Number(options.propertyType),
      );
    }

    const total = data.length;
    const start = (options.page - 1) * options.perPage;

    return Promise.resolve({
      data: data
        .slice(start, start + options.perPage)
        .map((listing) => this.withIncludes(listing, options.includes)),
      total,
    });
  }

  findById(
    tenantId: string,
    id: string,
    includes: ListingInclude[] = [],
  ): Promise<Listing | null> {
    const listing =
      listings.find(
        (candidate) => candidate.tenantId === tenantId && candidate.id === id,
      ) ?? null;

    return Promise.resolve(
      listing === null ? null : this.withIncludes(listing, includes),
    );
  }

  create(data: ListingCreateInput): Promise<Listing> {
    const listing = baseListing({
      id: `listing-${listings.length + 1}`,
      tenantId: data.tenantId,
      title: data.title,
      address: data.address,
      price: String(data.price),
      status: data.status ?? 1,
      bedrooms: data.bedrooms ?? 0,
      bathrooms: data.bathrooms ?? 0,
      propertyType: data.propertyType ?? 1,
    });

    listings.push(listing);
    listingContacts[listing.id] = data.contactIds ?? [];
    listingUsers[listing.id] = (data.userIds ?? []).map((userId) => ({
      userId,
      isPrimaryOwner: userId === data.primaryOwnerUserId ? true : null,
    }));

    return Promise.resolve(listing);
  }

  update(
    tenantId: string,
    id: string,
    data: ListingUpdateInput,
  ): Promise<Listing | null> {
    const index = listings.findIndex(
      (listing) => listing.tenantId === tenantId && listing.id === id,
    );

    if (index === -1) {
      return Promise.resolve(null);
    }

    listings[index] = {
      ...listings[index],
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.price !== undefined ? { price: String(data.price) } : {}),
      ...(data.status !== undefined ? { status: data.status ?? 1 } : {}),
      ...(data.bedrooms !== undefined ? { bedrooms: data.bedrooms ?? 0 } : {}),
      ...(data.bathrooms !== undefined
        ? { bathrooms: data.bathrooms ?? 0 }
        : {}),
      ...(data.propertyType !== undefined
        ? { propertyType: data.propertyType ?? 1 }
        : {}),
    };

    if (data.contactIds !== undefined) {
      listingContacts[id] = data.contactIds ?? [];
    }

    if (data.userIds !== undefined) {
      listingUsers[id] = (data.userIds ?? []).map((userId) => ({
        userId,
        isPrimaryOwner: userId === data.primaryOwnerUserId ? true : null,
      }));
    }

    return Promise.resolve(listings[index]);
  }

  private withIncludes(listing: Listing, includes: ListingInclude[]): Listing {
    return {
      ...listing,
      ...(includes.includes('documents')
        ? { documents: listingDocuments[listing.id] ?? [] }
        : {}),
      ...(includes.includes('contacts')
        ? { contactIds: listingContacts[listing.id] ?? [] }
        : {}),
      ...(includes.includes('users')
        ? { userLinks: listingUsers[listing.id] ?? [] }
        : {}),
    };
  }
}

class FakeContactService {
  findContactsByIds(
    tenantId: string,
    ids: string[],
  ): Promise<ContactResponseDto[]> {
    return Promise.resolve(
      ids
        .filter((id) => tenantId === 'tenant-1' && id === contactId)
        .map((id) => ({
          id,
          tenant_id: tenantId,
          owner_id: primaryAgentId,
          first_name: 'Ethan',
          last_name: 'Miller',
          email: 'ethan@example.com',
          phone: '+62812345678',
          status: true,
          status_label: 'Active',
          budget: 500000,
          source_id: 1,
          source: 'Website',
          last_contacted_at: '2026-05-30T00:00:00.000Z',
          created_at: '2026-09-14T05:15:00.000Z',
        })),
    );
  }

  contactsBelongToTenant(tenantId: string, ids: string[]): Promise<boolean> {
    return Promise.resolve(
      tenantId === 'tenant-1' && ids.every((id) => id === contactId),
    );
  }
}

class FakeUserService {
  userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    return Promise.resolve(
      tenantId === 'tenant-1' &&
        [primaryAgentId, secondaryAgentId].includes(userId),
    );
  }

  usersBelongToTenant(tenantId: string, ids: string[]): Promise<boolean> {
    return Promise.resolve(
      tenantId === 'tenant-1' &&
        ids.every((id) => [primaryAgentId, secondaryAgentId].includes(id)),
    );
  }

  findMembersByIds(
    tenantId: string,
    ids: string[],
  ): Promise<MemberResponseDto[]> {
    return Promise.resolve(
      ids
        .filter(
          (id) =>
            tenantId === 'tenant-1' &&
            [primaryAgentId, secondaryAgentId].includes(id),
        )
        .map((id) => ({
          id,
          tenant_id: tenantId,
          role: Roles.SALES,
          roles: [Roles.SALES],
          direct_permissions: [],
          name: id === primaryAgentId ? 'Priya Agent' : 'Jon Agent',
          email:
            id === primaryAgentId
              ? 'priya.agent@example.com'
              : 'jon.agent@example.com',
          created_at: '2026-09-14T05:15:00.000Z',
        })),
    );
  }
}

class FakeActivityService {
  recordListingCreated(): Promise<void> {
    return Promise.resolve();
  }

  recordListingUpdated(): Promise<void> {
    return Promise.resolve();
  }
}

describe('ListingController API', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    listings = [
      baseListing(),
      baseListing({
        id: 'listing-2',
        title: 'Downtown Loft',
        address: '44 City Center',
        status: 4,
        propertyType: 4,
      }),
      baseListing({
        id: 'outside-listing',
        tenantId: 'tenant-2',
        title: 'Outside Estate',
      }),
    ];
    listingContacts = { 'listing-1': [contactId] };
    listingUsers = {
      'listing-1': [
        { userId: secondaryAgentId, isPrimaryOwner: null },
        { userId: primaryAgentId, isPrimaryOwner: true },
      ],
    };
    listingDocuments = {
      'listing-1': [
        {
          id: 'document-1',
          tenantId: 'tenant-1',
          model: 'listing',
          modelId: 'listing-1',
          type: 'mainImage',
          subtype: null,
          fileName: null,
          order: 1,
          url: 'https://example.test/listing.jpg',
          createdAt: '2026-09-14T05:15:00.000Z',
          updatedAt: '2026-09-14T05:15:00.000Z',
        },
      ],
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ListingController],
      providers: [
        Reflector,
        RbacGuard,
        ListingService,
        {
          provide: ListingRepository,
          useClass: FakeListingRepository,
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

  it('requires authentication for listing resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/listings')
      .expect(401)
      .expect({ message: 'Unauthenticated.' });
  });

  it('blocks tenant header crossover for listing resources', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/listings')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-2')
      .expect(403);
  });

  it('lists paginated listings without relations by default', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/listings?page=1&per_page=1&search=harbor')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          id: 'listing-1',
          tenant_id: 'tenant-1',
          title: 'Harbor View Residence',
          price: 875000,
          status: 1,
          property_type: 1,
        });
        expect(response.body.data[0].contacts).toBeUndefined();
        expect(response.body.data[0].users).toBeUndefined();
        expect(response.body.data[0].documents).toBeUndefined();
        expect(response.body.meta).toMatchObject({
          current_page: 1,
          per_page: 1,
          total: 1,
        });
      });
  });

  it('filters listings and includes requested relations', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get(
        '/api/v1/listings?filter[status]=1&filter[property_type]=1&include[]=documents&include[]=contacts&include[]=users',
      )
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].documents[0].url).toBe(
          'https://example.test/listing.jpg',
        );
        expect(response.body.data[0].contacts[0].id).toBe(contactId);
        expect(response.body.data[0].users[0]).toMatchObject({
          id: primaryAgentId,
          is_primary_owner: true,
        });
      });
  });

  it('fetches listing details with requested relations', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/listings/listing-1?include[]=documents&include[]=contacts')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data.id).toBe('listing-1');
        expect(response.body.data.documents[0].url).toBe(
          'https://example.test/listing.jpg',
        );
        expect(response.body.data.contacts[0].id).toBe(contactId);
        expect(response.body.data.users).toBeUndefined();
      });
  });

  it('creates a listing with Laravel response shape and lean relations', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/listings')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        title: 'Garden Residence',
        address: '99 Garden Way',
        price: 925000,
        status: 2,
        bedrooms: 5,
        bathrooms: 4,
        property_type: 6,
        contact_ids: [contactId],
        user_ids: [secondaryAgentId, primaryAgentId],
        primary_owner_user_id: primaryAgentId,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          tenant_id: 'tenant-1',
          title: 'Garden Residence',
          address: '99 Garden Way',
          price: 925000,
          status: 2,
          bedrooms: 5,
          bathrooms: 4,
          property_type: 6,
        });
        expect(response.body.data.contacts).toBeUndefined();
        expect(response.body.data.users).toBeUndefined();
        expect(listingContacts[response.body.data.id]).toEqual([contactId]);
        expect(listingUsers[response.body.data.id]).toContainEqual({
          userId: primaryAgentId,
          isPrimaryOwner: true,
        });
      });
  });

  it('updates listing assignments with PATCH and PUT routes', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .patch('/api/v1/listings/listing-1')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        contact_ids: [],
        user_ids: [secondaryAgentId],
        primary_owner_user_id: secondaryAgentId,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.id).toBe('listing-1');
        expect(listingContacts['listing-1']).toEqual([]);
        expect(listingUsers['listing-1']).toEqual([
          { userId: secondaryAgentId, isPrimaryOwner: true },
        ]);
      });

    await request(server)
      .put('/api/v1/listings/listing-1')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({ title: 'Harbor View Updated' })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.title).toBe('Harbor View Updated');
      });
  });

  it('returns not found when a listing belongs to another tenant', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .get('/api/v1/listings/outside-listing')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(404);
  });

  it('forbids users missing mutation permission', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/listings')
      .set('Authorization', 'Bearer viewer-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        title: 'Garden Residence',
        address: '99 Garden Way',
        price: 925000,
      })
      .expect(403);
  });

  it('rejects assignments outside the authenticated tenant', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .post('/api/v1/listings')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        title: 'Garden Residence',
        address: '99 Garden Way',
        price: 925000,
        contact_ids: [outsideContactId],
      })
      .expect(422)
      .expect((response) => {
        expect(response.body.errors.contact_ids).toEqual([
          'The selected contact ids are invalid.',
        ]);
      });

    await request(server)
      .post('/api/v1/listings')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        title: 'Garden Residence',
        address: '99 Garden Way',
        price: 925000,
        user_ids: [outsideAgentId],
        primary_owner_user_id: outsideAgentId,
      })
      .expect(422)
      .expect((response) => {
        expect(response.body.errors.user_ids).toEqual([
          'The selected user ids are invalid.',
        ]);
        expect(response.body.errors.primary_owner_user_id).toEqual([
          'The selected primary owner user id is invalid.',
        ]);
      });
  });

  it('requires the primary owner to be an assigned user', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/listings')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        title: 'Garden Residence',
        address: '99 Garden Way',
        price: 925000,
        user_ids: [secondaryAgentId],
        primary_owner_user_id: primaryAgentId,
      })
      .expect(422)
      .expect((response) => {
        expect(response.body.errors.primary_owner_user_id).toEqual([
          'The primary owner must be one of the assigned users.',
        ]);
      });
  });
});
