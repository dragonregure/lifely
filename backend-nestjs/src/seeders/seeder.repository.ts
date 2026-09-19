import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { Contact } from '../contact/contact.type.js';
import { Lead } from '../lead/lead.type.js';
import { Listing } from '../listing/listing.type.js';
import { User } from '../user/user.type.js';

type TenantRecord = {
  id: string;
  name: string;
  createdAt: string;
};

export type CreateDemoContactInput = {
  tenantId: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: boolean;
  budget: number;
  source: number;
  lastContactedAt: string | null;
};

export type CreateDemoListingInput = {
  tenantId: string;
  title: string;
  address: string;
  price: number;
  status: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: number;
};

export type CreateDemoLeadInput = {
  tenantId: string;
  contactId: string;
  listingId: string;
  userId: string;
  stage: number;
  source: number;
  isActive: boolean;
  nextTask: string | null;
  dueAt: string | null;
};

export type CreateDemoUserInput = {
  tenantId: string;
  role: string;
  name: string;
  email: string;
  password: string;
};

type CreateSystemReferenceInput = {
  group: string;
  key: string;
  value: string;
  type: string;
};

@Injectable()
export class SeederRepository {
  async findTenantById(id: string): Promise<TenantRecord | null> {
    return db.orm.public.Tenant.where({ id }).first();
  }

  async createTenant(id: string, name: string): Promise<TenantRecord> {
    return db.orm.public.Tenant.create({ id, name });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return db.orm.public.User.where({ email }).first();
  }

  async createUser(input: CreateDemoUserInput): Promise<User> {
    return db.orm.public.User.create({
      tenantId: input.tenantId,
      role: input.role,
      name: input.name,
      email: input.email,
      password: input.password,
      emailVerifiedAt: null,
    });
  }

  async findContactByEmail(
    tenantId: string,
    email: string,
  ): Promise<Contact | null> {
    return db.orm.public.Contact.where({ tenantId, email }).first();
  }

  async createContact(input: CreateDemoContactInput): Promise<Contact> {
    return db.orm.public.Contact.create({
      tenantId: input.tenantId,
      ownerId: input.ownerId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      status: input.status,
      budget: String(input.budget),
      source: input.source,
      lastContactedAt: input.lastContactedAt,
    });
  }

  async findListingByTitle(
    tenantId: string,
    title: string,
  ): Promise<Listing | null> {
    return db.orm.public.Listing.where({ tenantId, title }).first();
  }

  async createListing(input: CreateDemoListingInput): Promise<Listing> {
    return db.orm.public.Listing.create({
      tenantId: input.tenantId,
      title: input.title,
      address: input.address,
      price: String(input.price),
      status: input.status,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      propertyType: input.propertyType,
    });
  }

  async listingContactExists(
    listingId: string,
    contactId: string,
  ): Promise<boolean> {
    const link = await db.orm.public.ListingContact.where({
      listingId,
      contactId,
    }).first();

    return link !== null;
  }

  async createListingContact(
    listingId: string,
    contactId: string,
  ): Promise<void> {
    await db.orm.public.ListingContact.create({ listingId, contactId });
  }

  async listingUserExists(listingId: string, userId: string): Promise<boolean> {
    const link = await db.orm.public.ListingUser.where({
      listingId,
      userId,
    }).first();

    return link !== null;
  }

  async createListingUser(
    listingId: string,
    userId: string,
    isPrimaryOwner: boolean | null,
  ): Promise<void> {
    await db.orm.public.ListingUser.create({
      listingId,
      userId,
      isPrimaryOwner,
    });
  }

  async findLeadByRelationship(
    tenantId: string,
    contactId: string,
    listingId: string,
    userId: string,
  ): Promise<Lead | null> {
    return db.orm.public.Lead.where({
      tenantId,
      contactId,
      listingId,
      userId,
    }).first();
  }

  async findLeadByContactListing(
    tenantId: string,
    contactId: string,
    listingId: string,
  ): Promise<Lead | null> {
    return db.orm.public.Lead.where({
      tenantId,
      contactId,
      listingId,
    }).first();
  }

  async createLead(input: CreateDemoLeadInput): Promise<Lead> {
    return db.orm.public.Lead.create({
      tenantId: input.tenantId,
      contactId: input.contactId,
      listingId: input.listingId,
      userId: input.userId,
      stage: input.stage,
      source: input.source,
      isActive: input.isActive,
      nextTask: input.nextTask,
      dueAt: input.dueAt,
    });
  }

  async updateLeadAssignee(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await db.orm.public.Lead.where({ tenantId, id }).update({
      userId,
      updatedAt: new Date().toISOString(),
    });
  }

  async systemReferenceExists(group: string, key: string): Promise<boolean> {
    const reference = await db.orm.public.Reference.where({
      tenantId: null,
      group,
      referenceKey: key,
      deletedAt: null,
    }).first();

    return reference !== null;
  }

  async createSystemReference(
    input: CreateSystemReferenceInput,
  ): Promise<void> {
    await db.orm.public.Reference.create({
      tenantId: null,
      group: input.group,
      referenceKey: input.key,
      value: input.value,
      type: input.type,
      meta: null,
      status: 'ACTIVE',
    });
  }
}
