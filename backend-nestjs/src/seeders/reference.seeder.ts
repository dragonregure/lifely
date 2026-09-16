import { Injectable } from '@nestjs/common';
import { REFERENCE_TYPE_GROUP } from '../reference/reference.constants.js';
import { SeederRepository } from './seeder.repository.js';

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
  constructor(private readonly seederRepository: SeederRepository) {}

  async run(): Promise<void> {
    for (const referenceType of SYSTEM_REFERENCE_TYPES) {
      const existing = await this.seederRepository.systemReferenceExists(
        REFERENCE_TYPE_GROUP,
        referenceType.key,
      );

      if (existing) {
        continue;
      }

      await this.seederRepository.createSystemReference({
        group: REFERENCE_TYPE_GROUP,
        key: referenceType.key,
        value: referenceType.value,
        type: 'string',
      });
    }
  }
}
