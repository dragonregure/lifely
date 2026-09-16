import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ActivityModule } from '../activity/activity.module.js';
import { bullModuleOptions } from '../queue/queue.config.js';
import { LeadModule } from './lead.module.js';
import { LEADS_QUEUE } from './lead-lifecycle.constants.js';
import { LeadLifecycleScheduler } from './lead-lifecycle.scheduler.js';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    BullModule.forRoot(bullModuleOptions()),
    BullModule.registerQueue({ name: LEADS_QUEUE }),
  ],
  providers: [LeadLifecycleScheduler],
})
export class LeadLifecycleEnqueueCommandModule {}

@Module({
  imports: [EventEmitterModule.forRoot(), LeadModule, ActivityModule],
})
export class LeadLifecycleRunCommandModule {}
