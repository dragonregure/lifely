import { NestFactory } from '@nestjs/core';
import { db } from '../prisma/db.js';
import { BasicUserSeeder } from './basic-user.seeder.js';
import { ReferenceSeeder } from './reference.seeder.js';
import { RbacSeeder } from './rbac.seeder.js';
import { SeederModule } from './seeder.module.js';

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeederModule, {
    logger: false,
  });

  try {
    await app.get(RbacSeeder).run();
    await app.get(ReferenceSeeder).run();
    await app.get(BasicUserSeeder).run();
  } finally {
    await app.close();
  }
}

seed()
  .then(() => {
    console.log('Seeded RBAC defaults, reference types, and basic demo user.');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
