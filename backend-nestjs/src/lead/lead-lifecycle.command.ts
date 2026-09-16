import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import {
  LeadLifecycleEnqueueCommandModule,
  LeadLifecycleRunCommandModule,
} from './lead-lifecycle-command.module.js';
import { LeadLifecycleScheduler } from './lead-lifecycle.scheduler.js';
import { LeadLifecycleService } from './lead-lifecycle.service.js';

type LifecycleCommand = 'enqueue' | 'run';

const command = process.argv[2] as LifecycleCommand | undefined;

if (process.env['NODE_ENV'] === 'production') {
  console.error('The lead lifecycle command is for development only.');
  process.exitCode = 1;
} else if (command !== 'enqueue' && command !== 'run') {
  console.error('Usage: npm run lead:lifecycle -- <enqueue|run>');
  process.exitCode = 1;
} else {
  const module =
    command === 'enqueue'
      ? LeadLifecycleEnqueueCommandModule
      : LeadLifecycleRunCommandModule;
  const app = await NestFactory.createApplicationContext(module, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    if (command === 'enqueue') {
      await app.get(LeadLifecycleScheduler).enqueueDailyLifecycleJob();
      console.log('Queued process-lead-lifecycle on the leads queue.');
    } else {
      await app.get(LeadLifecycleService).process();
      console.log('Ran process-lead-lifecycle immediately.');
    }
  } finally {
    await app.close();
    process.exit(0);
  }
}
