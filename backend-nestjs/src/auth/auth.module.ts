import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [RbacModule],
  controllers: [AuthController],
  providers: [AuthGuard, AuthService, PasswordService, TokenService],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}
