import { NestFactory } from '@nestjs/core';
import { db } from '../prisma/db.js';
import { BasicUserSeeder } from './basic-user.seeder.js';
import { CrmDemoDataSeeder } from './crm-demo-data.seeder.js';
import { ReferenceSeeder } from './reference.seeder.js';
import { RbacSeeder } from './rbac.seeder.js';
import { SeederModule } from './seeder.module.js';

const LOCAL_DATABASE_URL =
  'postgresql://lifely:secret@localhost:5433/lifely_nestjs';

async function seed(): Promise<void> {
  await db.connect({ url: process.env['DATABASE_URL'] ?? LOCAL_DATABASE_URL });

  const app = await NestFactory.createApplicationContext(SeederModule, {
    logger: false,
  });

  try {
    await app.get(RbacSeeder).run();
    await app.get(ReferenceSeeder).run();
    await app.get(BasicUserSeeder).run();
    await app.get(CrmDemoDataSeeder).run();
  } finally {
    await app.close();
  }
}

seed()
  .then(() => {
    console.log(
      'Seeded RBAC defaults, reference types, demo user, and CRM demo data.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
