#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4b1f632242089fb216cb16301260f4a847ae9fff23213f66160077794aa85292/contract';
import endContract from '../../snapshots/4b1f632242089fb216cb16301260f4a847ae9fff23213f66160077794aa85292/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/591dad2bad49e32e1775dc0f1f240ad7cfc2e88c75d6ffb4db7b0529d5de7f46/contract';
import startContract from '../../snapshots/591dad2bad49e32e1775dc0f1f240ad7cfc2e88c75d6ffb4db7b0529d5de7f46/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'leads',
        columns: [
          col('contactId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dueAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('listingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('nextTask', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'int2', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int2@1' },
          }),
          col('stage', 'int2', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int2@1' },
          }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_contactId_idx_ec98db2a',
        columns: ['contactId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_listingId_idx_953decda',
        columns: ['listingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_tenantId_contactId_idx_1215b2c3',
        columns: ['tenantId', 'contactId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_tenantId_isActive_idx_b4d0b12b',
        columns: ['tenantId', 'isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_tenantId_listingId_idx_00ebf4b7',
        columns: ['tenantId', 'listingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_tenantId_source_idx_892e802b',
        columns: ['tenantId', 'source'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_tenantId_stage_idx_f1ef85ba',
        columns: ['tenantId', 'stage'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_tenantId_userId_idx_6c855033',
        columns: ['tenantId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leads',
        index: 'leads_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leads',
        foreignKey: {
          name: 'leads_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leads',
        foreignKey: {
          name: 'leads_contactId_fkey',
          columns: ['contactId'],
          references: { schema: 'public', table: 'contacts', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leads',
        foreignKey: {
          name: 'leads_listingId_fkey',
          columns: ['listingId'],
          references: { schema: 'public', table: 'listings', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leads',
        foreignKey: {
          name: 'leads_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
