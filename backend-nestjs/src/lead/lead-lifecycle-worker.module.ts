import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LeadModule } from './lead.module.js';
import { LEADS_QUEUE } from './lead-lifecycle.constants.js';
import { LeadLifecycleProcessor } from './lead-lifecycle.processor.js';

@Module({
  imports: [LeadModule, BullModule.registerQueue({ name: LEADS_QUEUE })],
  providers: [LeadLifecycleProcessor],
})
export class LeadLifecycleWorkerModule {}
