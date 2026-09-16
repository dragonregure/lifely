import { BullRootModuleOptions } from '@nestjs/bullmq';

export function queueRuntimeEnabled(): boolean {
  return (
    process.env['LIFELY_QUEUE_ENABLED'] !== 'false' &&
    process.env['NODE_ENV'] !== 'test' &&
    process.env['JEST_WORKER_ID'] === undefined
  );
}

export function bullModuleOptions(): BullRootModuleOptions {
  const password = process.env['REDIS_PASSWORD'] || undefined;

  return {
    connection: {
      host: process.env['REDIS_HOST'] ?? '127.0.0.1',
      port: positiveInt(process.env['REDIS_PORT'], 6379),
      ...(password ? { password } : {}),
    },
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
