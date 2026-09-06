import { spawn } from 'child_process';
import path from 'path';

const PORT = process.env.PORT || '3000';
const BACKEND_PORT = process.env.BACKEND_PORT || '3001';

console.log('\n========================================');
console.log('🌿 Aura Journal — Production Cloud Run Runner');
console.log(`   Public Port: ${PORT} (0.0.0.0)`);
console.log(`   Internal API: ${BACKEND_PORT} (127.0.0.1)`);
console.log('========================================\n');

// 1. Start Backend API Server
const backend = spawn('node', ['node_modules/tsx/dist/cli.mjs', 'server.ts'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: BACKEND_PORT, NODE_ENV: process.env.NODE_ENV || 'production' },
});

// 2. Start Frontend App Router (bound to 0.0.0.0 on PORT)
const frontend = spawn(
  'node',
  ['node_modules/vinext/dist/cli.js', 'dev', '-H', '0.0.0.0', '-p', PORT],
  {
    cwd: path.resolve(process.cwd(), 'frontend google'),
    stdio: 'inherit',
    env: { ...process.env, PORT, NODE_ENV: process.env.NODE_ENV || 'production' },
  }
);

function cleanup() {
  try {
    backend.kill();
  } catch {}
  try {
    frontend.kill();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
