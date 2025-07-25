const { spawn } = require('child_process');
const path = require('path');

// Set the working directory
process.chdir(__dirname);

// Start npm with proper environment
const npmProcess = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PATH: process.env.PATH
  }
});

npmProcess.on('error', (error) => {
  console.error('Failed to start npm:', error);
  process.exit(1);
});

npmProcess.on('close', (code) => {
  console.log(`npm process exited with code ${code}`);
  process.exit(code);
});