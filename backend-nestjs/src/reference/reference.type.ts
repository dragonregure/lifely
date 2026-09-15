export type ReferenceStatus = 'ACTIVE' | 'INACTIVE';

export type ReferenceValueType =
  'string' | 'int' | 'float' | 'double' | 'bool' | 'array' | 'object' | 'null';

export type ReferenceValue =
  string | number | boolean | unknown[] | Record<string, unknown> | null;

export type ReferenceMeta = unknown;

export type Reference = {
  id: string;
  tenantId: string | null;
  group: string;
  referenceKey: string;
  value: string | null;
  type: string;
  meta: ReferenceMeta;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
