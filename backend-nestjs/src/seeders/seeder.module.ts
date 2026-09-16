import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { BasicUserSeeder } from './basic-user.seeder.js';
import { ReferenceSeeder } from './reference.seeder.js';
import { RbacSeeder } from './rbac.seeder.js';
import { SeederRepository } from './seeder.repository.js';

@Module({
  imports: [AuthModule, RbacModule],
  providers: [BasicUserSeeder, RbacSeeder, ReferenceSeeder, SeederRepository],
})
export class SeederModule {}
