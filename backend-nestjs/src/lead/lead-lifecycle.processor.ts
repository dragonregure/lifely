import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  LEADS_QUEUE,
  PROCESS_LEAD_LIFECYCLE_JOB,
} from './lead-lifecycle.constants.js';
import { LeadLifecycleService } from './lead-lifecycle.service.js';

@Injectable()
@Processor(LEADS_QUEUE, { concurrency: 1 })
export class LeadLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(LeadLifecycleProcessor.name);

  constructor(private readonly lifecycleService: LeadLifecycleService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== PROCESS_LEAD_LIFECYCLE_JOB) {
      return;
    }

    this.logger.log(`Processing ${PROCESS_LEAD_LIFECYCLE_JOB}.`);
    await this.lifecycleService.process();
    this.logger.log(`Processed ${PROCESS_LEAD_LIFECYCLE_JOB}.`);
  }
}
