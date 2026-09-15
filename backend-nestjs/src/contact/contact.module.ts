import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UserModule } from '../user/user.module.js';
import { ContactController } from './contact.controller.js';
import { ContactRepository } from './contact.repository.js';
import { ContactService } from './contact.service.js';

@Module({
  imports: [ActivityModule, AuthModule, RbacModule, UserModule],
  controllers: [ContactController],
  providers: [ContactRepository, ContactService],
  exports: [ContactService],
})
export class ContactModule {}
