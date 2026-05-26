import { execFileSync, spawnSync } from 'node:child_process';

const DEFAULT_PORTS = [3000, 3001, 3002, 4200];
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const requestedPorts = args
  .filter((arg) => arg !== '--dry-run')
  .flatMap((arg) => arg.split(','))
  .map((arg) => Number(arg.trim()))
  .filter((port) => Number.isInteger(port) && port > 0);
const ports = requestedPorts.length ? requestedPorts : DEFAULT_PORTS;

const pids = new Set();

for (const port of ports) {
  for (const pid of listenersForPort(port)) {
    if (pid !== process.pid) {
      pids.add(pid);
    }
  }
}

if (pids.size === 0) {
  console.log(`No listeners found on ports ${ports.join(', ')}.`);
  process.exit(0);
}

const sortedPids = [...pids].sort((a, b) => a - b);
if (dryRun) {
  console.log(`Would kill PIDs ${sortedPids.join(', ')} on ports ${ports.join(', ')}.`);
  process.exit(0);
}

for (const pid of sortedPids) {
  killProcessTree(pid);
}

console.log(`Killed PIDs ${sortedPids.join(', ')} on ports ${ports.join(', ')}.`);

function listenersForPort(port) {
  return process.platform === 'win32'
    ? windowsListenersForPort(port)
    : unixListenersForPort(port);
}

function windowsListenersForPort(port) {
  const script = [
    `$items = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
    '$items | Select-Object -ExpandProperty OwningProcess -Unique',
  ].join('; ');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.status !== 0) return [];
  return parsePids(result.stdout);
}

function unixListenersForPort(port) {
  const outputs = [];
  try {
    outputs.push(execFileSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' }));
  } catch {}
  try {
    outputs.push(execFileSync('fuser', [`${port}/tcp`], { encoding: 'utf8' }));
  } catch {}
  return parsePids(outputs.join('\n'));
}

function parsePids(value) {
  return value
    .split(/\s+/)
    .map((item) => Number(item.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function killProcessTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {}
}
