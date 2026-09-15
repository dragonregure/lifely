import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { ReportingController } from './reporting.controller.js';
import { ReportingRepository } from './reporting.repository.js';
import { ReportingService } from './reporting.service.js';

@Module({
  imports: [AuthModule, RbacModule, ActivityModule],
  controllers: [ReportingController],
  providers: [ReportingRepository, ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
