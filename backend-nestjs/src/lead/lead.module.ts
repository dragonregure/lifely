import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ContactModule } from '../contact/contact.module.js';
import { ListingModule } from '../listing/listing.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UserModule } from '../user/user.module.js';
import { LeadController } from './lead.controller.js';
import { LeadRepository } from './lead.repository.js';
import { LeadService } from './lead.service.js';

@Module({
  imports: [AuthModule, RbacModule, ContactModule, ListingModule, UserModule],
  controllers: [LeadController],
  providers: [LeadRepository, LeadService],
  exports: [LeadRepository],
})
export class LeadModule {}
