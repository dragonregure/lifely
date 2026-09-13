import { db } from '../prisma/db.js';
import { BasicUserSeeder } from './basic-user.seeder.js';
import { RbacSeeder } from './rbac.seeder.js';

async function seed(): Promise<void> {
  await new RbacSeeder().run();
  await new BasicUserSeeder().run();
}

seed()
  .then(() => {
    console.log('Seeded RBAC defaults and basic demo user.');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
