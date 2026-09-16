import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LeadModule } from './lead.module.js';
import { LEADS_QUEUE } from './lead-lifecycle.constants.js';
import { LeadLifecycleProcessor } from './lead-lifecycle.processor.js';
import { LeadLifecycleScheduler } from './lead-lifecycle.scheduler.js';
import { LeadLifecycleService } from './lead-lifecycle.service.js';

@Module({
  imports: [LeadModule, BullModule.registerQueue({ name: LEADS_QUEUE })],
  providers: [
    LeadLifecycleProcessor,
    LeadLifecycleScheduler,
    LeadLifecycleService,
  ],
})
export class LeadAutomationModule {}
