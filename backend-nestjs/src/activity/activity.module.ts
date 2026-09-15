import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { ActivityController } from './activity.controller.js';
import { ActivityRepository } from './activity.repository.js';
import { ActivityService } from './activity.service.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [ActivityController],
  providers: [ActivityRepository, ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
