import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ContactModule } from '../contact/contact.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UserModule } from '../user/user.module.js';
import { ListingController } from './listing.controller.js';
import { ListingRepository } from './listing.repository.js';
import { ListingService } from './listing.service.js';

@Module({
  imports: [AuthModule, RbacModule, ContactModule, UserModule],
  controllers: [ListingController],
  providers: [ListingRepository, ListingService],
  exports: [ListingService],
})
export class ListingModule {}
