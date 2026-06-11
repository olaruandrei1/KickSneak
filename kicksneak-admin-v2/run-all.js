const { spawn } = require('child_process');

console.log('[Runner] Starting both Next.js Dev Server (Port 3002) and Standalone WebSocket Server (Port 3005)...');

const wsProcess = spawn('node', ['ws-server.js'], {
  stdio: 'inherit',
  shell: true
});

const nextProcess = spawn('npx', ['next', 'dev', '-p', '3002'], {
  stdio: 'inherit',
  shell: true
});

function cleanUp() {
  console.log('\n[Runner] Shutting down sub-servers...');
  try {
    wsProcess.kill('SIGINT');
  } catch (e) {}
  try {
    nextProcess.kill('SIGINT');
  } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);

// Handle exit of either process
wsProcess.on('exit', (code) => {
  console.log(`[Runner] WebSocket server exited with code ${code}`);
  cleanUp();
});

nextProcess.on('exit', (code) => {
  console.log(`[Runner] Next.js dev server exited with code ${code}`);
  cleanUp();
});
