import { BullRootModuleOptions } from '@nestjs/bullmq';
import { Redis } from 'ioredis';

export function queueRuntimeEnabled(): boolean {
  return (
    process.env['LIFELY_QUEUE_ENABLED'] !== 'false' &&
    process.env['NODE_ENV'] !== 'test' &&
    process.env['JEST_WORKER_ID'] === undefined
  );
}

export function queueWorkerRuntimeEnabled(): boolean {
  return (
    queueRuntimeEnabled() &&
    process.env['LIFELY_QUEUE_WORKER_ENABLED'] === 'true'
  );
}

export function schedulerRuntimeEnabled(): boolean {
  return (
    queueRuntimeEnabled() && process.env['LIFELY_SCHEDULER_ENABLED'] === 'true'
  );
}

export function bullModuleOptions(): BullRootModuleOptions {
  const password = process.env['REDIS_PASSWORD'] || undefined;

  return {
    connection: new Redis({
      host: process.env['REDIS_HOST'] ?? '127.0.0.1',
      port: positiveInt(process.env['REDIS_PORT'], 6379),
      maxRetriesPerRequest: null,
      ...(password ? { password } : {}),
    }),
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
