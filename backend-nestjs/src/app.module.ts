import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { ContactModule } from './contact/contact.module.js';
import { LeadModule } from './lead/lead.module.js';
import { ListingModule } from './listing/listing.module.js';
import { RbacApiModule } from './rbac/rbac-api.module.js';
import { ReferenceModule } from './reference/reference.module.js';
import { UserModule } from './user/user.module.js';

@Module({
  imports: [
    AuthModule,
    UserModule,
    RbacApiModule,
    ContactModule,
    ListingModule,
    LeadModule,
    ReferenceModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
