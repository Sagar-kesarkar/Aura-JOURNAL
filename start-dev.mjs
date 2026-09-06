import { spawn } from 'child_process';
import path from 'path';

console.log('\n========================================');
console.log('🌿 Aura Journal — Starting Full Stack');
console.log('   Frontend: http://localhost:3000');
console.log('   Backend API: http://localhost:3001');
console.log('========================================\n');

// 1. Start Backend API Server (Express + Gemini + Firebase Admin)
const backend = spawn('node', ['node_modules/tsx/dist/cli.mjs', 'server.ts'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' },
});

// 2. Start New Frontend (frontend google - Vinext App Router)
const frontend = spawn('node', ['node_modules/vinext/dist/cli.js', 'dev', '-H', '0.0.0.0', '-p', '3000'], {
  cwd: path.resolve(process.cwd(), 'frontend google'),
  stdio: 'inherit',
  env: { ...process.env, PORT: '3000' },
});

function cleanup() {
  try {
    backend.kill();
  } catch {}
  try {
    frontend.kill();
  } catch {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
