import { Injectable } from '@nestjs/common';
import type { JsonValue } from '@prisma/orm-postgres/target/codec-types';
import { db } from '../prisma/db.js';
import { Reference as ReferenceModel } from '../prisma/prisma.service.js';
import { REFERENCE_TYPE_GROUP } from './reference.constants.js';
import type { Reference, ReferenceMeta } from './reference.type.js';

export type ReferenceSortKey =
  | 'reference'
  | 'key'
  | 'group'
  | 'value'
  | 'type'
  | 'status'
  | 'updated'
  | 'updated_at'
  | 'created_at';

export type ReferenceQueryOptions = {
  tenantId: string;
  search?: string;
  group?: string;
  type?: string;
  status?: string;
  scope?: string;
  sort: ReferenceSortKey;
  direction: 'asc' | 'desc';
  page: number;
  perPage: number;
};

export type ReferenceQueryResult = {
  data: Reference[];
  total: number;
};

export type ReferenceCreateInput = {
  currentTenantId: string;
  tenantId?: string | null;
  group: string;
  key: string;
  value?: string | null;
  type?: string;
  meta?: ReferenceMeta;
  status?: string;
};

export type ReferenceUpdateInput = Partial<
  Omit<ReferenceCreateInput, 'currentTenantId'>
>;

export class DuplicateReferenceError extends Error {
  constructor() {
    super('Duplicate reference group and key.');
  }
}

export class ReferenceTenantMismatchError extends Error {
  constructor() {
    super('Reference tenant does not match the current tenant context.');
  }
}

@Injectable()
export class ReferenceRepository {
  async find(options: ReferenceQueryOptions): Promise<ReferenceQueryResult> {
    const references = await this.visibleToTenant(options.tenantId);
    const filtered = this.filterReferences(references, options);
    const sorted = this.sortReferences(
      filtered,
      options.sort,
      options.direction,
    );
    const start = (options.page - 1) * options.perPage;

    return {
      data: sorted.slice(start, start + options.perPage),
      total: sorted.length,
    };
  }

  async findById(tenantId: string, id: string): Promise<Reference | null> {
    const reference = await ReferenceModel.where({ id }).first();

    if (!reference || reference.deletedAt !== null) {
      return null;
    }

    return this.isVisibleToTenant(reference, tenantId) ? reference : null;
  }

  async referenceTypeOptions(
    tenantId: string,
  ): Promise<Array<{ label: string; value: string }>> {
    const references = await this.visibleToTenant(tenantId);

    return references
      .filter((reference) => reference.group === REFERENCE_TYPE_GROUP)
      .sort((left, right) =>
        String(left.value ?? left.referenceKey).localeCompare(
          String(right.value ?? right.referenceKey),
        ),
      )
      .map((reference) => ({
        label: reference.value ?? reference.referenceKey,
        value: reference.referenceKey,
      }));
  }

  async groupOptions(
    tenantId: string,
  ): Promise<Array<{ label: string; value: string }>> {
    const groups = [
      ...new Set(
        (await this.visibleToTenant(tenantId)).map(
          (reference) => reference.group,
        ),
      ),
    ].sort();

    return groups.map((group) => ({
      label: this.titleFromGroup(group),
      value: group,
    }));
  }

  async create(data: ReferenceCreateInput): Promise<Reference> {
    const tenantId = this.tenantIdFromPayload(
      data.currentTenantId,
      data.tenantId,
      data.currentTenantId,
    );

    await this.ensureUnique(tenantId, data.group, data.key);

    return ReferenceModel.create({
      tenantId,
      group: data.group,
      referenceKey: data.key,
      value: data.value ?? null,
      type: data.type ?? 'string',
      meta: this.jsonValue(data.meta),
      status: data.status ?? 'ACTIVE',
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: ReferenceUpdateInput,
  ): Promise<Reference | null> {
    const reference = await this.findById(tenantId, id);

    if (!reference) {
      return null;
    }

    const nextTenantId = Object.prototype.hasOwnProperty.call(data, 'tenantId')
      ? this.tenantIdFromPayload(tenantId, data.tenantId, reference.tenantId)
      : reference.tenantId;
    const nextGroup = data.group ?? reference.group;
    const nextKey = data.key ?? reference.referenceKey;

    await this.ensureUnique(nextTenantId, nextGroup, nextKey, id);

    await db.transaction(async (tx) => {
      await tx.orm.public.Reference.where({ id }).update({
        ...(Object.prototype.hasOwnProperty.call(data, 'tenantId')
          ? { tenantId: nextTenantId }
          : {}),
        ...(data.group !== undefined ? { group: data.group } : {}),
        ...(data.key !== undefined ? { referenceKey: data.key } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'value')
          ? { value: data.value ?? null }
          : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'meta')
          ? { meta: this.jsonValue(data.meta) }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        updatedAt: new Date().toISOString(),
      });
    });

    return this.findById(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const reference = await this.findById(tenantId, id);

    if (!reference) {
      return false;
    }

    await ReferenceModel.where({ id }).update({
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return true;
  }

  private async visibleToTenant(tenantId: string): Promise<Reference[]> {
    const references = await ReferenceModel.where({}).all();

    return references.filter(
      (reference) =>
        reference.deletedAt === null &&
        this.isVisibleToTenant(reference, tenantId),
    );
  }

  private isVisibleToTenant(reference: Reference, tenantId: string): boolean {
    return reference.tenantId === null || reference.tenantId === tenantId;
  }

  private filterReferences(
    references: Reference[],
    options: ReferenceQueryOptions,
  ): Reference[] {
    const needle = options.search?.trim().toLowerCase();

    return references.filter((reference) => {
      const matchesSearch =
        !needle ||
        [
          reference.group,
          reference.referenceKey,
          reference.value,
          reference.type,
          reference.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);

      return (
        matchesSearch &&
        (!options.group || reference.group === options.group) &&
        (!options.type || reference.type === options.type) &&
        (!options.status || reference.status === options.status) &&
        (options.scope !== 'system' || reference.tenantId === null) &&
        (options.scope !== 'tenant' || reference.tenantId === options.tenantId)
      );
    });
  }

  private sortReferences(
    references: Reference[],
    sort: ReferenceSortKey,
    direction: 'asc' | 'desc',
  ): Reference[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...references].sort((left, right) => {
      const leftValue = this.sortValue(left, sort);
      const rightValue = this.sortValue(right, sort);

      return (
        String(leftValue ?? '')
          .toLowerCase()
          .localeCompare(String(rightValue ?? '').toLowerCase()) * multiplier
      );
    });
  }

  private sortValue(
    reference: Reference,
    sort: ReferenceSortKey,
  ): string | null {
    const sortable: Record<ReferenceSortKey, string | null> = {
      reference: reference.referenceKey,
      key: reference.referenceKey,
      group: reference.group,
      value: reference.value,
      type: reference.type,
      status: reference.status,
      updated: reference.updatedAt,
      updated_at: reference.updatedAt,
      created_at: reference.createdAt,
    };

    return sortable[sort];
  }

  private tenantIdFromPayload(
    currentTenantId: string,
    requestedTenantId: string | null | undefined,
    defaultTenantId: string | null,
  ): string | null {
    const tenantId =
      requestedTenantId === undefined ? defaultTenantId : requestedTenantId;

    if (tenantId !== null && tenantId !== currentTenantId) {
      throw new ReferenceTenantMismatchError();
    }

    return tenantId;
  }

  private async ensureUnique(
    tenantId: string | null,
    group: string,
    key: string,
    ignoreId?: string,
  ): Promise<void> {
    const references = await ReferenceModel.where({}).all();
    const exists = references.some(
      (reference) =>
        reference.deletedAt === null &&
        reference.id !== ignoreId &&
        reference.tenantId === tenantId &&
        reference.group === group &&
        reference.referenceKey === key,
    );

    if (exists) {
      throw new DuplicateReferenceError();
    }
  }

  private titleFromGroup(group: string): string {
    return group
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private jsonValue(value: unknown): JsonValue | null {
    return value === undefined || value === null ? null : (value as JsonValue);
  }
}
