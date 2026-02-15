#!/usr/bin/env node

// Unset dummy environment variables that may be set by Claude Code
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.AZURE_CLIENT_ID;
delete process.env.AZURE_CLIENT_SECRET;
delete process.env.AZURE_TENANT_ID;
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;

// Spawn next dev process
const { spawn } = require('child_process');
const child = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code);
});
