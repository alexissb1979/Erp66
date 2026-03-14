import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This script starts the server using tsx, which is necessary for cPanel's Node.js selector
// to handle the TypeScript server file.
const child = spawn('npx', ['tsx', 'server.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('close', (code) => {
  process.exit(code);
});
