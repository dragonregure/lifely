import { Module } from '@nestjs/common';
import { PasswordService } from '../auth/password.service.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { BasicUserSeeder } from './basic-user.seeder.js';
import { RbacSeeder } from './rbac.seeder.js';
import { SeederRepository } from './seeder.repository.js';

@Module({
  imports: [RbacModule],
  providers: [BasicUserSeeder, PasswordService, RbacSeeder, SeederRepository],
})
export class SeederModule {}
