import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { ReferenceController } from './reference.controller.js';
import { ReferenceRepository } from './reference.repository.js';
import { ReferenceService } from './reference.service.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [ReferenceController],
  providers: [ReferenceRepository, ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
