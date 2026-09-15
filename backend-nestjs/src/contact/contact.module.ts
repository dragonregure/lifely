import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UserRepository } from '../user/user.repository.js';
import { ContactController } from './contact.controller.js';
import { ContactRepository } from './contact.repository.js';
import { ContactService } from './contact.service.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [ContactController],
  providers: [ContactRepository, ContactService, UserRepository],
})
export class ContactModule {}
