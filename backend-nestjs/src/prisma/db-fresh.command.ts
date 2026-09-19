import 'dotenv/config';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const SYSTEM_DATABASES = new Set(['postgres', 'template0', 'template1']);

type Command = {
  args: string[];
  command: string;
};

const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const args = process.argv.slice(2);
const shouldSeed = args.includes('--seed');
const shouldShowHelp = args.includes('--help') || args.includes('-h');
const unknownArgs = args.filter(
  (arg) => arg !== '--seed' && arg !== '--help' && arg !== '-h',
);

if (shouldShowHelp) {
  console.log('Usage: npm run db:fresh -- [--seed]');
  console.log('');
  console.log(
    'Drops and recreates the DATABASE_URL database, then runs Prisma migrations.',
  );
  console.log('Pass --seed to run npm run seed after migrations finish.');
  process.exit(0);
}

if (unknownArgs.length > 0) {
  console.error(`Unknown argument: ${unknownArgs.join(', ')}`);
  console.error('Usage: npm run db:fresh -- [--seed]');
  process.exit(1);
}

if (process.env['NODE_ENV'] === 'production') {
  console.error('The db:fresh command is for development only.');
  process.exit(1);
}

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  console.error('DATABASE_URL is required to run db:fresh.');
  process.exit(1);
}

const targetUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(targetUrl.pathname.replace(/^\//, ''));

if (!databaseName) {
  console.error('DATABASE_URL must include a database name.');
  process.exit(1);
}

if (SYSTEM_DATABASES.has(databaseName)) {
  console.error(`Refusing to drop system database "${databaseName}".`);
  process.exit(1);
}

const maintenanceDatabase =
  process.env['DB_FRESH_MAINTENANCE_DATABASE'] ?? 'postgres';
const maintenanceUrl = new URL(databaseUrl);
maintenanceUrl.pathname = `/${encodeURIComponent(maintenanceDatabase)}`;

const quoteIdentifier = (identifier: string) =>
  `"${identifier.replaceAll('"', '""')}"`;

const runCommand = (label: string, command: Command) =>
  new Promise<void>((resolvePromise, reject) => {
    console.log(`\n> ${label}`);

    const child = spawn(command.command, command.args, {
      cwd: projectRoot,
      env: process.env,
      shell: false,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code ?? 'unknown'}.`));
    });
  });

const npmCommand = (script: string): Command => {
  const npmExecPath = process.env['npm_execpath'];

  if (npmExecPath?.endsWith('.js')) {
    return {
      command: process.execPath,
      args: [npmExecPath, 'run', script],
    };
  }

  if (npmExecPath) {
    return {
      command: npmExecPath,
      args: ['run', script],
    };
  }

  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', script],
  };
};

const prismaCommand = (): Command => ({
  command: process.execPath,
  args: [
    resolve(projectRoot, 'node_modules', 'prisma', 'dist', 'prisma.js'),
    'db',
    'migrate',
  ],
});

const resetDatabase = async () => {
  const client = new Client({ connectionString: maintenanceUrl.toString() });

  await client.connect();

  try {
    await client.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName],
    );
    await client.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`,
    );
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
};

try {
  console.log(`Dropping and recreating database "${databaseName}".`);
  await resetDatabase();
  await runCommand('Run Prisma migrations', prismaCommand());

  if (shouldSeed) {
    await runCommand('Seed database', npmCommand('seed'));
  }

  console.log('\ndb:fresh completed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
