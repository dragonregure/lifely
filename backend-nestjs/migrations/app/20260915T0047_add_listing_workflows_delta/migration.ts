#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5396d24e6af703319ac0921f5934059f0f426cf4fd4c49c69e82b5d99b692d55/contract';
import startContract from '../../snapshots/5396d24e6af703319ac0921f5934059f0f426cf4fd4c49c69e82b5d99b692d55/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/591dad2bad49e32e1775dc0f1f240ad7cfc2e88c75d6ffb4db7b0529d5de7f46/contract';
import endContract from '../../snapshots/591dad2bad49e32e1775dc0f1f240ad7cfc2e88c75d6ffb4db7b0529d5de7f46/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'documents',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fileName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('model', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('modelId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('order', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('subtype', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'listing_contacts',
        columns: [
          col('contactId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('listingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['listingId', 'contactId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'listing_users',
        columns: [
          col('isPrimaryOwner', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('listingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['listingId', 'userId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'listings',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('bathrooms', 'int2', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int2@1' },
          }),
          col('bedrooms', 'int2', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int2@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('price', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('propertyType', 'int2', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int2@1' },
          }),
          col('status', 'int2', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int2@1' },
          }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'listing_users',
        constraint: 'listing_users_listingId_isPrimaryOwner_key',
        columns: ['listingId', 'isPrimaryOwner'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documents',
        index: 'documents_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documents',
        index: 'documents_tenantId_model_modelId_idx_a6c86dce',
        columns: ['tenantId', 'model', 'modelId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documents',
        index: 'documents_tenantId_model_modelId_type_order_idx_177301c7',
        columns: ['tenantId', 'model', 'modelId', 'type', 'order'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'listing_contacts',
        index: 'listing_contacts_contactId_idx_ec98db2a',
        columns: ['contactId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'listing_contacts',
        index: 'listing_contacts_listingId_idx_953decda',
        columns: ['listingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'listing_users',
        index: 'listing_users_listingId_idx_953decda',
        columns: ['listingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'listing_users',
        index: 'listing_users_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'listings',
        index: 'listings_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'listings',
        index: 'listings_tenantId_propertyType_idx_d611bbc1',
        columns: ['tenantId', 'propertyType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'listings',
        index: 'listings_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documents',
        foreignKey: {
          name: 'documents_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'listing_contacts',
        foreignKey: {
          name: 'listing_contacts_listingId_fkey',
          columns: ['listingId'],
          references: { schema: 'public', table: 'listings', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'listing_contacts',
        foreignKey: {
          name: 'listing_contacts_contactId_fkey',
          columns: ['contactId'],
          references: { schema: 'public', table: 'contacts', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'listing_users',
        foreignKey: {
          name: 'listing_users_listingId_fkey',
          columns: ['listingId'],
          references: { schema: 'public', table: 'listings', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'listing_users',
        foreignKey: {
          name: 'listing_users_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'listings',
        foreignKey: {
          name: 'listings_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
