const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Ensure Rust & Cargo bin directory is in PATH even if the current shell session was started before Rust installation
const cargoBin = path.join(os.homedir(), '.cargo', 'bin');
const envPath = process.env.PATH || '';
const sep = process.platform === 'win32' ? ';' : ':';

if (!envPath.split(sep).some(p => p.toLowerCase() === cargoBin.toLowerCase())) {
  process.env.PATH = `${cargoBin}${sep}${envPath}`;
}

const args = process.argv.slice(2);
const tauriBin = process.platform === 'win32'
  ? path.join(__dirname, '..', 'node_modules', '.bin', 'tauri.cmd')
  : path.join(__dirname, '..', 'node_modules', '.bin', 'tauri');

const runner = fs.existsSync(tauriBin) ? `"${tauriBin}"` : 'npx tauri';
const fullCmd = [runner, ...args].join(' ');

const child = spawn(fullCmd, {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
