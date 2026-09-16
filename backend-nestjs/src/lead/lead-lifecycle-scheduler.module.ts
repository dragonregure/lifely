import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LEADS_QUEUE } from './lead-lifecycle.constants.js';
import { LeadLifecycleScheduler } from './lead-lifecycle.scheduler.js';

@Module({
  imports: [BullModule.registerQueue({ name: LEADS_QUEUE })],
  providers: [LeadLifecycleScheduler],
})
export class LeadLifecycleSchedulerModule {}
