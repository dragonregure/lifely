import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ActivityModule } from './activity/activity.module.js';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { ContactModule } from './contact/contact.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { LeadAutomationModule } from './lead/lead-automation.module.js';
import { LeadModule } from './lead/lead.module.js';
import {
  bullModuleOptions,
  queueRuntimeEnabled,
} from './queue/queue.config.js';
import { ListingModule } from './listing/listing.module.js';
import { RbacApiModule } from './rbac/rbac-api.module.js';
import { ReferenceModule } from './reference/reference.module.js';
import { ReportingModule } from './reporting/reporting.module.js';
import { UserModule } from './user/user.module.js';

const queueImports = queueRuntimeEnabled()
  ? [
      ScheduleModule.forRoot(),
      BullModule.forRoot(bullModuleOptions()),
      LeadAutomationModule,
    ]
  : [];

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
  ],
  controllers: [AppController],
})
export class AppModule {}
