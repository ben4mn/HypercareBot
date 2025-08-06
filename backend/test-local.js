import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('Starting local test environment...\n');

// Start the backend server
const backend = spawn('node', ['src/index.js'], {
  cwd: '.',
  env: { ...process.env, NODE_ENV: 'test' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;

backend.stdout.on('data', (data) => {
  console.log(`Backend: ${data}`);
  if (data.toString().includes('Server running on port')) {
    serverReady = true;
  }
});

backend.stderr.on('data', (data) => {
  console.error(`Backend Error: ${data}`);
});

// Wait for server to start
async function waitForServer() {
  let attempts = 0;
  while (!serverReady && attempts < 30) {
    await setTimeout(1000);
    attempts++;
  }
  if (!serverReady) {
    throw new Error('Server failed to start');
  }
}

// Run tests
async function runTests() {
  try {
    await waitForServer();
    console.log('\nServer is ready, running tests...\n');
    
    // Run the test file
    const tests = spawn('node', ['tests/api.test.js'], {
      cwd: '.',
      stdio: 'inherit'
    });
    
    tests.on('close', (code) => {
      console.log(`\nTests completed with code ${code}`);
      backend.kill();
      process.exit(code);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    backend.kill();
    process.exit(1);
  }
}

runTests();