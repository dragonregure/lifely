import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { ReportingModule } from '../reporting/reporting.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [AuthModule, RbacModule, ReportingModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
