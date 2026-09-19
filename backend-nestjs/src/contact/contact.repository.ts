import { Injectable } from '@nestjs/common';
import { Contact as ContactModel } from '../prisma/prisma.service.js';
import { Contact } from './contact.type.js';

export type ContactSortKey =
  | 'contact'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'status'
  | 'owner'
  | 'budget'
  | 'source'
  | 'last-contacted'
  | 'created_at';

export type ContactQueryOptions = {
  tenantId: string;
  search?: string;
  status?: string;
  source?: string;
  ownerId?: string;
  sort: ContactSortKey;
  direction: 'asc' | 'desc';
  page: number;
  perPage: number;
};

export type ContactQueryResult = {
  data: Contact[];
  total: number;
};

export type ContactCreateInput = {
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
};

export type ContactUpdateInput = Partial<Omit<ContactCreateInput, 'tenantId'>>;

@Injectable()
export class ContactRepository {
  async find(options: ContactQueryOptions): Promise<ContactQueryResult> {
    const contacts = await ContactModel.where({
      tenantId: options.tenantId,
    }).all();
    const filtered = this.filterContacts(contacts, options);
    const sorted = this.sortContacts(filtered, options.sort, options.direction);
    const start = (options.page - 1) * options.perPage;

    return {
      data: sorted.slice(start, start + options.perPage),
      total: sorted.length,
    };
  }

  async findById(tenantId: string, id: string): Promise<Contact | null> {
    return ContactModel.where({ tenantId, id }).first();
  }

  async findByIds(tenantId: string, ids: string[]): Promise<Contact[]> {
    if (ids.length === 0) {
      return [];
    }

    const contacts = await ContactModel.where({ tenantId }).all();
    const idSet = new Set(ids);

    return contacts.filter((contact) => idSet.has(contact.id));
  }

  async create(data: ContactCreateInput): Promise<Contact> {
    return ContactModel.create({
      tenantId: data.tenantId,
      ownerId: data.ownerId ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      status: data.status ?? true,
      budget: this.budgetValue(data.budget),
      source: data.source ?? 0,
      lastContactedAt: data.lastContactedAt ?? null,
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: ContactUpdateInput,
  ): Promise<Contact | null> {
    const contact = await this.findById(tenantId, id);

    if (!contact) {
      return null;
    }

    await ContactModel.where({ tenantId, id }).update({
      ...(Object.prototype.hasOwnProperty.call(data, 'ownerId')
        ? { ownerId: data.ownerId ?? null }
        : {}),
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(Object.prototype.hasOwnProperty.call(data, 'phone')
        ? { phone: data.phone ?? null }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(data, 'budget')
        ? { budget: this.budgetValue(data.budget) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(data, 'source')
        ? { source: data.source ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(data, 'lastContactedAt')
        ? { lastContactedAt: data.lastContactedAt ?? null }
        : {}),
      updatedAt: new Date().toISOString(),
    });

    return this.findById(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const contact = await this.findById(tenantId, id);

    if (!contact) {
      return false;
    }

    await ContactModel.where({ tenantId, id }).delete();

    return true;
  }

  private filterContacts(
    contacts: Contact[],
    options: ContactQueryOptions,
  ): Contact[] {
    const needle = options.search?.trim().toLowerCase();
    const status = this.statusFilter(options.status);
    const sources = this.sourceFilter(options.source);
    const ownerIds = this.commaSeparated(options.ownerId);

    return contacts.filter((contact) => {
      const matchesSearch =
        !needle ||
        [contact.firstName, contact.lastName, contact.email, contact.phone]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus = status === null || contact.status === status;
      const matchesSource =
        sources.length === 0 ||
        (contact.source !== null && sources.includes(contact.source));
      const matchesOwner =
        ownerIds.length === 0 ||
        (contact.ownerId !== null && ownerIds.includes(contact.ownerId));

      return matchesSearch && matchesStatus && matchesSource && matchesOwner;
    });
  }

  private sortContacts(
    contacts: Contact[],
    sort: ContactSortKey,
    direction: 'asc' | 'desc',
  ): Contact[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...contacts].sort((left, right) => {
      const leftValue = this.sortValue(left, sort);
      const rightValue = this.sortValue(right, sort);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * multiplier;
      }

      return (
        String(leftValue ?? '')
          .toLowerCase()
          .localeCompare(String(rightValue ?? '').toLowerCase()) * multiplier
      );
    });
  }

  private sortValue(contact: Contact, key: ContactSortKey): string | number {
    const sortable: Record<ContactSortKey, string | number | null> = {
      contact: contact.firstName,
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      status: contact.status ? 1 : 0,
      owner: contact.ownerId,
      budget: this.numericBudget(contact.budget),
      source: contact.source,
      'last-contacted': contact.lastContactedAt,
      created_at: contact.createdAt,
    };

    return sortable[key] ?? '';
  }

  private statusFilter(value?: string): boolean | null {
    const normalized = value?.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    if (['active', '1', 'true'].includes(normalized)) {
      return true;
    }

    if (['inactive', '0', 'false'].includes(normalized)) {
      return false;
    }

    return null;
  }

  private sourceFilter(value?: string): number[] {
    return this.commaSeparated(value)
      .map((source) => sourceFromInput(source))
      .filter((source): source is number => source !== null);
  }

  private commaSeparated(value?: string): string[] {
    if (!value) {
      return [];
    }

    return [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  private budgetValue(value: number | null | undefined): string | null {
    return value === undefined || value === null ? null : String(value);
  }

  private numericBudget(value: string | number | null): number {
    return value === null ? 0 : Number(value);
  }
}

export const CONTACT_SOURCE_LABELS = {
  0: 'Manual Entry',
  1: 'Website',
  2: 'Listing Inquiry',
  3: 'Social Media',
  4: 'Referral',
  5: 'Phone Call',
  6: 'Messaging',
  7: 'Email',
  8: 'Paid Ads',
  9: 'Portal',
  10: 'Exhibition',
  11: 'Integration',
  12: 'Walk-in',
  13: 'Open House',
  14: 'Developer Partner',
  15: 'Bulk Import',
} as const;

export function sourceLabel(source: number | null): string | null {
  if (source === null) {
    return null;
  }

  return (
    CONTACT_SOURCE_LABELS[source as keyof typeof CONTACT_SOURCE_LABELS] ??
    CONTACT_SOURCE_LABELS[0]
  );
}

export function sourceFromInput(source: string): number | null {
  const normalized = source.trim().toLowerCase().replace(/\s+/g, ' ');

  if (normalized === '') {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    const sourceValue = Number.parseInt(normalized, 10);

    return sourceValue in CONTACT_SOURCE_LABELS ? sourceValue : null;
  }

  const match = Object.entries(CONTACT_SOURCE_LABELS).find(
    ([, label]) => label.toLowerCase() === normalized,
  );

  return match ? Number.parseInt(match[0], 10) : null;
}
