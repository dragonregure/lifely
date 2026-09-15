import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { REFERENCE_TYPE_GROUP } from '../reference/reference.repository.js';

const SYSTEM_REFERENCE_TYPES = [
  { key: 'string', value: 'String' },
  { key: 'int', value: 'Integer' },
  { key: 'float', value: 'Float' },
  { key: 'bool', value: 'Boolean' },
  { key: 'array', value: 'Array' },
  { key: 'object', value: 'Object' },
  { key: 'null', value: 'Null' },
];

@Injectable()
export class ReferenceSeeder {
  async run(): Promise<void> {
    const references = await db.orm.public.Reference.where({}).all();

    for (const referenceType of SYSTEM_REFERENCE_TYPES) {
      const existing = references.find(
        (reference) =>
          reference.tenantId === null &&
          reference.group === REFERENCE_TYPE_GROUP &&
          reference.referenceKey === referenceType.key &&
          reference.deletedAt === null,
      );

      if (existing) {
        continue;
      }

      await db.orm.public.Reference.create({
        tenantId: null,
        group: REFERENCE_TYPE_GROUP,
        referenceKey: referenceType.key,
        value: referenceType.value,
        type: 'string',
        meta: null,
        status: 'ACTIVE',
      });
    }
  }
}
