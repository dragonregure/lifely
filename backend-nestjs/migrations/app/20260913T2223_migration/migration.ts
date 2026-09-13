#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1e8412e162dbbe69f4bb3bf8d07f0280ae67eaab15c34dcf201e67468315428d/contract';
import startContract from '../../snapshots/1e8412e162dbbe69f4bb3bf8d07f0280ae67eaab15c34dcf201e67468315428d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b58f1d1ba1d2411c4f7255291d92d34655923d5a4e4ad534154c27ef001e7000/contract';
import endContract from '../../snapshots/b58f1d1ba1d2411c4f7255291d92d34655923d5a4e4ad534154c27ef001e7000/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'post' }),
      this.dropTable({ schema: 'public', table: 'user' }),
      this.createTable({
        schema: 'public',
        table: 'model_has_permissions',
        columns: [
          col('modelId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('modelType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('permissionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['permissionId', 'modelId', 'modelType'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'model_has_roles',
        columns: [
          col('modelId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('modelType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('roleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['roleId', 'modelId', 'modelType'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'permissions',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('guardName', 'text', {
            notNull: true,
            default: lit('web'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'personal_access_tokens',
        columns: [
          col('ability', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastUsedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenableId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'role_has_permissions',
        columns: [
          col('permissionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('roleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['permissionId', 'roleId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'roles',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('guardName', 'text', {
            notNull: true,
            default: lit('web'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tenants',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('emailVerifiedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('Simple Agent'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'permissions',
        constraint: 'permissions_name_guardName_key',
        columns: ['name', 'guardName'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'personal_access_tokens',
        constraint: 'personal_access_tokens_token_key',
        columns: ['token'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'roles',
        constraint: 'roles_tenantId_name_guardName_key',
        columns: ['tenantId', 'name', 'guardName'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'model_has_permissions',
        index: 'model_has_permissions_modelId_idx_a8222b0e',
        columns: ['modelId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'model_has_permissions',
        index: 'model_has_permissions_modelId_modelType_idx_a1f47859',
        columns: ['modelId', 'modelType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'model_has_permissions',
        index: 'model_has_permissions_permissionId_idx_f46fcdf5',
        columns: ['permissionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'model_has_roles',
        index: 'model_has_roles_modelId_idx_a8222b0e',
        columns: ['modelId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'model_has_roles',
        index: 'model_has_roles_modelId_modelType_idx_a1f47859',
        columns: ['modelId', 'modelType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'model_has_roles',
        index: 'model_has_roles_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'personal_access_tokens',
        index: 'personal_access_tokens_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'personal_access_tokens',
        index: 'personal_access_tokens_tokenableId_idx_7e28c1c3',
        columns: ['tokenableId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'role_has_permissions',
        index: 'role_has_permissions_permissionId_idx_f46fcdf5',
        columns: ['permissionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'role_has_permissions',
        index: 'role_has_permissions_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roles',
        index: 'roles_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roles',
        index: 'roles_tenantId_name_idx_ff85d432',
        columns: ['tenantId', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'users_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'model_has_permissions',
        foreignKey: {
          name: 'model_has_permissions_permissionId_fkey',
          columns: ['permissionId'],
          references: { schema: 'public', table: 'permissions', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'model_has_permissions',
        foreignKey: {
          name: 'model_has_permissions_modelId_fkey',
          columns: ['modelId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'model_has_roles',
        foreignKey: {
          name: 'model_has_roles_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'roles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'model_has_roles',
        foreignKey: {
          name: 'model_has_roles_modelId_fkey',
          columns: ['modelId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'personal_access_tokens',
        foreignKey: {
          name: 'personal_access_tokens_tokenableId_fkey',
          columns: ['tokenableId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'role_has_permissions',
        foreignKey: {
          name: 'role_has_permissions_permissionId_fkey',
          columns: ['permissionId'],
          references: { schema: 'public', table: 'permissions', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'role_has_permissions',
        foreignKey: {
          name: 'role_has_permissions_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'roles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roles',
        foreignKey: {
          name: 'roles_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'users',
        foreignKey: {
          name: 'users_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
