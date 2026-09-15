import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UserController } from './user.controller.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
