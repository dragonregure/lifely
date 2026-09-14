import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RolePermissionController } from './role-permission.controller.js';
import { RbacModule } from './rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [RolePermissionController],
})
export class RbacApiModule {}
