import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const sourceDir = join(process.cwd(), 'node_modules', 'swagger-ui-dist');
const targetDir = join(process.cwd(), 'public', 'api', 'documentation');

await mkdir(targetDir, { recursive: true });

const entries = await readdir(sourceDir, { withFileTypes: true });

await Promise.all(
  entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      copyFile(join(sourceDir, entry.name), join(targetDir, entry.name)),
    ),
);
