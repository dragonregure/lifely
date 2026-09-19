#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8bc5b5f18702ee5e2a3a37feb3f850a443be7d09d74af4cff6f79096add262db/contract';
import startContract from '../../snapshots/8bc5b5f18702ee5e2a3a37feb3f850a443be7d09d74af4cff6f79096add262db/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/be318164dfcf5923ce9f669dac9b71696411fe67fe3fb8e8cb5d40b62710bac9/contract';
import endContract from '../../snapshots/be318164dfcf5923ce9f669dac9b71696411fe67fe3fb8e8cb5d40b62710bac9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'activity_logs',
        columns: [
          col('actionType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('properties', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'activity_logs',
        index: 'activity_logs_tenantId_actionType_idx_79607673',
        columns: ['tenantId', 'actionType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'activity_logs',
        index: 'activity_logs_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'activity_logs',
        index: 'activity_logs_tenantId_userId_idx_6c855033',
        columns: ['tenantId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'activity_logs',
        index: 'activity_logs_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'activity_logs',
        foreignKey: {
          name: 'activity_logs_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'activity_logs',
        foreignKey: {
          name: 'activity_logs_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
