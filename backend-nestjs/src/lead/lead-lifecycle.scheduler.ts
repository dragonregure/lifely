import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import {
  LEADS_QUEUE,
  PROCESS_LEAD_LIFECYCLE_JOB,
} from './lead-lifecycle.constants.js';

@Injectable()
export class LeadLifecycleScheduler {
  private readonly logger = new Logger(LeadLifecycleScheduler.name);

  constructor(@InjectQueue(LEADS_QUEUE) private readonly leadsQueue: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: PROCESS_LEAD_LIFECYCLE_JOB,
  })
  async enqueueDailyLifecycleJob(): Promise<void> {
    await this.leadsQueue.add(
      PROCESS_LEAD_LIFECYCLE_JOB,
      {},
      {
        jobId: PROCESS_LEAD_LIFECYCLE_JOB,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60_000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    this.logger.log(`Queued ${PROCESS_LEAD_LIFECYCLE_JOB}.`);
  }
}
