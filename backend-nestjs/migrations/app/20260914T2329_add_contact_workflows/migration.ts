#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5396d24e6af703319ac0921f5934059f0f426cf4fd4c49c69e82b5d99b692d55/contract';
import endContract from '../../snapshots/5396d24e6af703319ac0921f5934059f0f426cf4fd4c49c69e82b5d99b692d55/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b58f1d1ba1d2411c4f7255291d92d34655923d5a4e4ad534154c27ef001e7000/contract';
import startContract from '../../snapshots/b58f1d1ba1d2411c4f7255291d92d34655923d5a4e4ad534154c27ef001e7000/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'contacts',
        columns: [
          col('budget', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('lastContactedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'int2', { codecRef: { codecId: 'pg/int2@1' } }),
          col('status', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'contacts',
        index: 'contacts_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'contacts',
        index: 'contacts_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'contacts',
        index: 'contacts_tenantId_ownerId_idx_6f53c808',
        columns: ['tenantId', 'ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'contacts',
        index: 'contacts_tenantId_source_idx_892e802b',
        columns: ['tenantId', 'source'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'contacts',
        index: 'contacts_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'contacts',
        foreignKey: {
          name: 'contacts_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'contacts',
        foreignKey: {
          name: 'contacts_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
