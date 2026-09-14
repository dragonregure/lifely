import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { RbacApiModule } from './rbac/rbac-api.module.js';
import { UserModule } from './user/user.module.js';

@Module({
  imports: [AuthModule, UserModule, RbacApiModule],
  controllers: [AppController],
})
export class AppModule {}
