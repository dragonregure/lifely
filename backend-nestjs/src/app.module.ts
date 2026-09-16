import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ActivityModule } from './activity/activity.module.js';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { ContactModule } from './contact/contact.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthController } from './health.controller.js';
import { LeadLifecycleSchedulerModule } from './lead/lead-lifecycle-scheduler.module.js';
import { LeadLifecycleWorkerModule } from './lead/lead-lifecycle-worker.module.js';
import { LeadModule } from './lead/lead.module.js';
import { ListingModule } from './listing/listing.module.js';
import {
  bullModuleOptions,
  queueWorkerRuntimeEnabled,
  schedulerRuntimeEnabled,
} from './queue/queue.config.js';
import { RbacApiModule } from './rbac/rbac-api.module.js';
import { ReferenceModule } from './reference/reference.module.js';
import { ReportingModule } from './reporting/reporting.module.js';
import { UserModule } from './user/user.module.js';

const workerEnabled = queueWorkerRuntimeEnabled();
const schedulerEnabled = schedulerRuntimeEnabled();
const queueImports =
  workerEnabled || schedulerEnabled
    ? [BullModule.forRoot(bullModuleOptions())]
    : [];
const schedulerImports = schedulerEnabled
  ? [ScheduleModule.forRoot(), LeadLifecycleSchedulerModule]
  : [];
const workerImports = workerEnabled ? [LeadLifecycleWorkerModule] : [];

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AuthModule,
    UserModule,
    RbacApiModule,
    ContactModule,
    ListingModule,
    LeadModule,
    ReferenceModule,
    ActivityModule,
    ReportingModule,
    DashboardModule,
    ...queueImports,
    ...schedulerImports,
    ...workerImports,
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
