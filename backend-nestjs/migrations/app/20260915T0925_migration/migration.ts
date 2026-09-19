#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1e8412e162dbbe69f4bb3bf8d07f0280ae67eaab15c34dcf201e67468315428d/contract';
import startContract from '../../snapshots/1e8412e162dbbe69f4bb3bf8d07f0280ae67eaab15c34dcf201e67468315428d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8bc5b5f18702ee5e2a3a37feb3f850a443be7d09d74af4cff6f79096add262db/contract';
import endContract from '../../snapshots/8bc5b5f18702ee5e2a3a37feb3f850a443be7d09d74af4cff6f79096add262db/contract.json' with { type: 'json' };
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
        table: 'listing_users',
        constraint: 'listing_users_listingId_isPrimaryOwner_key',
        columns: ['listingId', 'isPrimaryOwner'],
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
        table: 'references',
        constraint: 'references_tenantId_group_referenceKey_key',
        columns: ['tenantId', 'group', 'referenceKey'],
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
        table: 'references',
        foreignKey: {
          name: 'references_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
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
