import { Injectable } from '@nestjs/common';
import { PasswordService } from '../auth/password.service.js';
import { Contact } from '../contact/contact.type.js';
import { Listing } from '../listing/listing.type.js';
import { RbacService } from '../rbac/rbac.service.js';
import { RoleName } from '../rbac/rbac.constants.js';
import { User } from '../user/user.type.js';
import { CrmDemoFactory } from './factories/crm-demo.factory.js';
import { SeederRepository } from './seeder.repository.js';

const DEMO_TENANT_ID = '0197066f-2aa2-73f8-93d1-56a73ad14220';
const DEMO_USER_EMAIL = 'maya@skyline.example';
const DEMO_USER_PASSWORD = 'password';
const GENERATED_USER_COUNT = 15;
const CONTACT_COUNT = 100;
const LISTING_COUNT = 200;
const LEAD_COUNT = 300;

@Injectable()
export class CrmDemoDataSeeder {
  private readonly factory = new CrmDemoFactory();

  constructor(
    private readonly passwordService: PasswordService,
    private readonly rbacService: RbacService,
    private readonly seederRepository: SeederRepository,
  ) {}

  async run(): Promise<void> {
    const admin = await this.seederRepository.findUserByEmail(DEMO_USER_EMAIL);

    if (!admin) {
      throw new Error('Demo user must be seeded before CRM demo data.');
    }

    const contacts = await this.seedContacts(admin.id);
    const listings = await this.seedListings();
    const users = await this.seedUsers();

    await this.seedListingLinks(admin.id, contacts, listings);
    await this.seedLeads(users, contacts, listings);
  }

  private async seedUsers(): Promise<User[]> {
    const users: User[] = [];
    const password = await this.passwordService.hash(DEMO_USER_PASSWORD);

    for (let index = 0; index < GENERATED_USER_COUNT; index += 1) {
      const userData = this.factory.user(DEMO_TENANT_ID, password, index);
      const user =
        (await this.seederRepository.findUserByEmail(userData.email)) ??
        (await this.seederRepository.createUser(userData));

      await this.rbacService.assignRoleToUser(
        user.id,
        userData.role as RoleName,
      );
      users.push(user);
    }

    return users;
  }

  private async seedContacts(ownerId: string): Promise<Contact[]> {
    const contacts: Contact[] = [];

    for (let index = 0; index < CONTACT_COUNT; index += 1) {
      const contactData = this.factory.contact(DEMO_TENANT_ID, ownerId, index);
      const existing = await this.seederRepository.findContactByEmail(
        DEMO_TENANT_ID,
        contactData.email,
      );

      if (existing) {
        contacts.push(existing);
        continue;
      }

      contacts.push(await this.seederRepository.createContact(contactData));
    }

    return contacts;
  }

  private async seedListings(): Promise<Listing[]> {
    const listings: Listing[] = [];

    for (let index = 0; index < LISTING_COUNT; index += 1) {
      const listingData = this.factory.listing(DEMO_TENANT_ID, index);
      const existing = await this.seederRepository.findListingByTitle(
        DEMO_TENANT_ID,
        listingData.title,
      );

      if (existing) {
        listings.push(existing);
        continue;
      }

      listings.push(await this.seederRepository.createListing(listingData));
    }

    return listings;
  }

  private async seedListingLinks(
    userId: string,
    contacts: Contact[],
    listings: Listing[],
  ): Promise<void> {
    for (const [index, listing] of listings.entries()) {
      if (
        !(await this.seederRepository.listingUserExists(listing.id, userId))
      ) {
        await this.seederRepository.createListingUser(listing.id, userId, true);
      }

      for (const contact of this.factory.listingContacts(index, contacts)) {
        const exists = await this.seederRepository.listingContactExists(
          listing.id,
          contact.id,
        );

        if (!exists) {
          await this.seederRepository.createListingContact(
            listing.id,
            contact.id,
          );
        }
      }
    }
  }

  private async seedLeads(
    users: User[],
    contacts: Contact[],
    listings: Listing[],
  ): Promise<void> {
    for (let index = 0; index < LEAD_COUNT; index += 1) {
      const leadData = this.factory.lead(
        DEMO_TENANT_ID,
        users,
        contacts,
        listings,
        index,
      );
      const existing = await this.seederRepository.findLeadByContactListing(
        DEMO_TENANT_ID,
        leadData.contactId,
        leadData.listingId,
      );

      if (existing) {
        if (existing.userId !== leadData.userId) {
          await this.seederRepository.updateLeadAssignee(
            DEMO_TENANT_ID,
            existing.id,
            leadData.userId,
          );
        }

        continue;
      }

      await this.seederRepository.createLead(leadData);
    }
  }
}
