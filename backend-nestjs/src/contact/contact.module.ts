import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UserModule } from '../user/user.module.js';
import { ContactController } from './contact.controller.js';
import { ContactRepository } from './contact.repository.js';
import { ContactService } from './contact.service.js';

@Module({
  imports: [AuthModule, RbacModule, UserModule],
  controllers: [ContactController],
  providers: [ContactRepository, ContactService],
})
export class ContactModule {}
