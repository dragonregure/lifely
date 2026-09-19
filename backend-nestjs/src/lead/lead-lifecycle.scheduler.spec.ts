import { jest } from '@jest/globals';
import { Queue } from 'bullmq';
import { PROCESS_LEAD_LIFECYCLE_JOB } from './lead-lifecycle.constants.js';
import { LeadLifecycleScheduler } from './lead-lifecycle.scheduler.js';

describe('LeadLifecycleScheduler', () => {
  it('enqueues the lifecycle job with a stable job id to prevent overlap', async () => {
    const queue = {
      add: jest.fn().mockResolvedValue({ id: PROCESS_LEAD_LIFECYCLE_JOB }),
    };
    const scheduler = new LeadLifecycleScheduler(queue as unknown as Queue);

    await scheduler.enqueueDailyLifecycleJob();

    expect(queue.add).toHaveBeenCalledWith(
      PROCESS_LEAD_LIFECYCLE_JOB,
      {},
      expect.objectContaining({
        jobId: PROCESS_LEAD_LIFECYCLE_JOB,
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
  });
});
