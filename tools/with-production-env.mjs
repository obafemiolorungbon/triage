import { spawnSync } from 'node:child_process';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node tools/with-production-env.mjs <command> [...args]');
  process.exit(1);
}

const result = spawnSync(command, args, {
  env: {
    ...process.env,
    NODE_ENV: 'production',
  },
  shell: true,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
