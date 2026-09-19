import { Module } from '@nestjs/common';
import { RbacGuard } from './rbac.guard.js';
import { RbacRepository } from './rbac.repository.js';
import { RbacService } from './rbac.service.js';

@Module({
  providers: [RbacRepository, RbacService, RbacGuard],
  exports: [RbacService, RbacGuard],
})
export class RbacModule {}
