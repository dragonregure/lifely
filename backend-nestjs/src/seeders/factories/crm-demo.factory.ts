import { faker } from '@faker-js/faker';
import {
  isClosedLeadStage,
  LeadSources,
  LeadStages,
} from '../../lead/lead.constants.js';
import { Contact } from '../../contact/contact.type.js';
import { Listing } from '../../listing/listing.type.js';
import { Roles } from '../../rbac/rbac.constants.js';
import { User } from '../../user/user.type.js';
import {
  CreateDemoContactInput,
  CreateDemoLeadInput,
  CreateDemoListingInput,
  CreateDemoUserInput,
} from '../seeder.repository.js';

const CONTACT_SOURCES = [1, 2, 3, 4, 5, 7, 8, 9, 12, 13, 14, 15] as const;
const LISTING_STATUSES = [1, 1, 1, 1, 2, 3, 4] as const;
const PROPERTY_TYPES = [1, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const USER_ROLES = [
  Roles.SENIOR_AGENT,
  Roles.SALES,
  Roles.PROPERTY_MANAGER,
  Roles.MARKETING_COORDINATOR,
  Roles.TRANSACTION_COORDINATOR,
  Roles.SIMPLE_AGENT,
] as const;
const NEXT_TASKS = [
  'Call buyer to confirm search priorities',
  'Send comparable listings and pricing note',
  'Schedule showing with listing owner',
  'Prepare offer strategy summary',
  'Follow up after open house visit',
  'Confirm financing timeline',
] as const;

export class CrmDemoFactory {
  constructor(seed = 20260919) {
    faker.seed(seed);
  }

  user(tenantId: string, password: string, index: number): CreateDemoUserInput {
    return {
      tenantId,
      role: USER_ROLES[index % USER_ROLES.length],
      name: faker.person.fullName(),
      email: `skyline.agent.${this.sequence(index)}@skyline.lifely.test`,
      password,
    };
  }

  contact(
    tenantId: string,
    ownerId: string,
    index: number,
  ): CreateDemoContactInput {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      tenantId,
      ownerId,
      firstName,
      lastName,
      email: `skyline.client.${this.sequence(index)}@client.lifely.test`,
      phone: faker.phone.number({ style: 'national' }),
      status: index % 11 !== 0,
      budget: faker.number.int({ min: 320000, max: 1800000 }),
      source: faker.helpers.arrayElement(CONTACT_SOURCES),
      lastContactedAt:
        index % 8 === 0
          ? null
          : this.daysFromNow(-faker.number.int({ min: 1, max: 45 })),
    };
  }

  listing(tenantId: string, index: number): CreateDemoListingInput {
    const propertyType = faker.helpers.arrayElement(PROPERTY_TYPES);

    return {
      tenantId,
      title: `${faker.location.street()} ${this.listingSuffix()} ${this.sequence(index)}`,
      address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state({ abbreviated: true })}`,
      price: faker.number.int({ min: 285000, max: 1800000 }),
      status: faker.helpers.arrayElement(LISTING_STATUSES),
      bedrooms: propertyType === 5 ? 0 : faker.number.int({ min: 1, max: 6 }),
      bathrooms: propertyType === 9 ? 0 : faker.number.int({ min: 1, max: 5 }),
      propertyType,
    };
  }

  lead(
    tenantId: string,
    users: User[],
    contacts: Contact[],
    listings: Listing[],
    index: number,
  ): CreateDemoLeadInput {
    const stages = Object.values(LeadStages);
    const sources = Object.values(LeadSources);
    const stage = stages[index % stages.length];

    return {
      tenantId,
      contactId: contacts[(index * 5) % contacts.length].id,
      listingId: listings[(index * 7) % listings.length].id,
      userId: faker.helpers.arrayElement(users).id,
      stage,
      source: sources[index % sources.length],
      isActive: !isClosedLeadStage(stage),
      nextTask: isClosedLeadStage(stage)
        ? null
        : faker.helpers.arrayElement(NEXT_TASKS),
      dueAt: isClosedLeadStage(stage)
        ? null
        : this.daysFromNow(faker.number.int({ min: -7, max: 30 })),
    };
  }

  listingContacts(index: number, contacts: Contact[]): Contact[] {
    return [
      contacts[(index * 3) % contacts.length],
      contacts[(index * 3 + 1) % contacts.length],
      contacts[(index * 3 + 2) % contacts.length],
    ];
  }

  private listingSuffix(): string {
    return faker.helpers.arrayElement([
      'Residence',
      'Townhome',
      'Loft',
      'Estate',
      'Studio',
      'Villa',
      'Office Suite',
      'Retail Suite',
      'Collection',
    ]);
  }

  private daysFromNow(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);

    return date.toISOString();
  }

  private sequence(index: number): string {
    return String(index + 1).padStart(3, '0');
  }
}
