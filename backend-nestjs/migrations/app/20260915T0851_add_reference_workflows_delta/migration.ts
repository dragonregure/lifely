#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4b1f632242089fb216cb16301260f4a847ae9fff23213f66160077794aa85292/contract';
import startContract from '../../snapshots/4b1f632242089fb216cb16301260f4a847ae9fff23213f66160077794aa85292/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8bc5b5f18702ee5e2a3a37feb3f850a443be7d09d74af4cff6f79096add262db/contract';
import endContract from '../../snapshots/8bc5b5f18702ee5e2a3a37feb3f850a443be7d09d74af4cff6f79096add262db/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'references',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deletedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('group', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('meta', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('referenceKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('string'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('value', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'references',
        constraint: 'references_tenantId_group_referenceKey_key',
        columns: ['tenantId', 'group', 'referenceKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'references',
        index: 'references_tenantId_group_idx_24c71a56',
        columns: ['tenantId', 'group'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'references',
        index: 'references_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'references',
        index: 'references_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'references',
        index: 'references_tenantId_type_idx_11d0b022',
        columns: ['tenantId', 'type'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'references',
        foreignKey: {
          name: 'references_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
