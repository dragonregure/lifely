import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ActivityModule } from './activity/activity.module.js';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { ContactModule } from './contact/contact.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { LeadModule } from './lead/lead.module.js';
import { ListingModule } from './listing/listing.module.js';
import { RbacApiModule } from './rbac/rbac-api.module.js';
import { ReferenceModule } from './reference/reference.module.js';
import { ReportingModule } from './reporting/reporting.module.js';
import { UserModule } from './user/user.module.js';

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
  ],
  controllers: [AppController],
})
export class AppModule {}
