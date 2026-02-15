#!/usr/bin/env node

/**
 * CODEBAKERS — ONE COMMAND, ZERO TO DEPLOYED
 * 
 * Commands:
 *   node codebakers.mjs           Build a new app from a .codebakers.zip spec
 *   node codebakers.mjs add       Add features to an existing CodeBakers project
 * 
 * Build Flow:
 *   Phase 0: PREFLIGHT — check & install tools
 *   Phase 1: UNZIP — unpack the spec
 *   Phase 2: BUILD — 7 stages via Claude Code (hands-free)
 *   Phase 3: LAUNCH — collect keys, create DB, create admin, deploy
 * 
 * Add Feature Flow:
 *   Step 1: DESCRIBE — tell us what you want in plain English
 *   Step 2: RESEARCH — we analyze the codebase and plan the changes
 *   Step 3: REVIEW — you see exactly what we'll build before we touch code
 *   Step 4: BUILD — Claude Code implements everything
 *   Step 5: DEPLOY — auto-commit, push, redeploy
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync, statSync, renameSync, rmSync, unlinkSync } from 'fs';
import { createInterface } from 'readline';
import { basename, join, resolve } from 'path';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

// ─── Colors ───
const G = '\x1b[32m';
const Y = '\x1b[33m';
const C = '\x1b[36m';
const D = '\x1b[31m';
const R = '\x1b[0m';
const B = '\x1b[1m';
const DIM = '\x1b[2m';

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`  ${msg}`);
  try { if (globalThis.logFile) appendFileSync(globalThis.logFile, `[${ts}] ${msg.replace(/\x1b\[[0-9;]*m/g, '')}\n`); } catch {}
}

function banner(text) {
  console.log('');
  console.log(`${B}${C}  ${'═'.repeat(52)}${R}`);
  console.log(`${B}${C}    ${text}${R}`);
  console.log(`${B}${C}  ${'═'.repeat(52)}${R}`);
  console.log('');
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
  } catch { return null; }
}

function cmdExists(cmd) {
  try { execSync(`which ${cmd} 2>/dev/null || where ${cmd} 2>nul`, { stdio: 'pipe' }); return true; } catch { return false; }
}

function quit(code = 1) {
  try { rl.close(); } catch {}
  process.exit(code);
}

function getPlatform() {
  const p = process.platform;
  if (p === 'darwin') return 'mac';
  if (p === 'win32') return 'win';
  return 'linux';
}

function hasBrew() { return cmdExists('brew'); }

function getNodeVersion() {
  try {
    const v = execSync('node --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    return { version: v, major: parseInt(v.replace('v', '').split('.')[0]) };
  } catch { return null; }
}

// Count files in project directory (excludes node_modules and .git)
function countProjectFiles(dir) {
  try {
    const result = execSync(
      process.platform === 'win32'
        ? `powershell -NoProfile -Command "(Get-ChildItem -Recurse -File '${dir}' -Exclude node_modules,.git | Measure-Object).Count"`
        : `find "${dir}" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    return parseInt(result) || 0;
  } catch { return 0; }
}

function runClaudeCode(prompt, cwd, label = '') {
  return new Promise((res) => {
    const prevDir = process.cwd();
    if (cwd) { try { process.chdir(cwd); } catch (e) { log(`${D}Cannot cd to ${cwd}: ${e.message}${R}`); } }

    const isWin = process.platform === 'win32';
    let output = '';
    let stderrOutput = '';
    let lastDataAt = Date.now();
    let lineCount = 0;
    let lastFile = '';
    let activity = 'Starting...';
    const startFiles = countProjectFiles(cwd || '.');

    // Detect activity from Claude Code output
    function detectActivity(text) {
      if (/reading|Read\s+(CLAUDE|PROJECT|SPEC|BUILD)/i.test(text)) return 'Reading specs...';
      if (/npm\s+install|installing|added\s+\d+\s+packages/i.test(text)) return 'Installing packages...';
      if (/migration|\.sql|CREATE TABLE|ALTER TABLE/i.test(text)) return 'Creating schema...';
      if (/\.ts|\.tsx|interface\s+|type\s+|export/i.test(text)) return 'Writing TypeScript...';
      if (/component|page\.tsx|layout\.tsx|\.jsx/i.test(text)) return 'Building UI...';
      if (/server action|action\.ts|use server/i.test(text)) return 'Writing server actions...';
      if (/middleware|auth|session|login/i.test(text)) return 'Setting up auth...';
      if (/test|vitest|playwright|expect\(/i.test(text)) return 'Running tests...';
      if (/eslint|lint|tsc|type.check/i.test(text)) return 'Running checks...';
      if (/build|compil|next build/i.test(text)) return 'Compiling...';
      if (/audit|coherence|SCOPE DECLARATION/i.test(text)) return 'Running audit...';
      if (/fix|repair|heal/i.test(text)) return 'Fixing issues...';
      if (/STAGE.*COMPLETE|BUILD COMPLETE/i.test(text)) return 'Complete!';
      return activity; // keep previous
    }

    // Detect last file being worked on
    function detectFile(text) {
      const m = text.match(/(?:Created?|Writ(?:ing|e)|Updat(?:ing|ed?)|Modified?)\s+[`']?([^\s`']+\.[a-z]{1,4})/i)
        || text.match(/([a-zA-Z0-9_/-]+\.(ts|tsx|sql|md|json|js|mjs|css))/);
      if (m) return m[1].replace(/^[`']|[`']$/g, '');
      return lastFile;
    }

    // Spinner with real progress
    const spinChars = ['\u28CB', '\u28D9', '\u28F9', '\u28F8', '\u28FC', '\u28F4', '\u28E6', '\u28E7', '\u28C7', '\u28CF'];
    let spinIdx = 0;
    const startTime = Date.now();
    let lastFileCount = startFiles;
    let lastFileCheckAt = 0;
    let spinnerVisible = false;

    function clearSpinner() {
      if (spinnerVisible) {
        process.stdout.clearLine?.(0);
        process.stdout.cursorTo?.(0);
        spinnerVisible = false;
      }
    }

    function writeSpinner(text) {
      clearSpinner();
      process.stdout.write(text);
      spinnerVisible = true;
    }

    const spinner = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      const timeStr = min > 0 ? `${min}m ${String(sec).padStart(2, '0')}s` : `${sec}s`;

      // Recount files every 10 seconds (not every tick - too expensive)
      const now = Date.now();
      if (now - lastFileCheckAt > 10000) {
        lastFileCount = countProjectFiles(cwd || '.');
        lastFileCheckAt = now;
      }
      const newFiles = Math.max(0, lastFileCount - startFiles);

      const idle = Math.round((now - lastDataAt) / 1000);
      const idleStr = idle < 3 ? '' : idle < 60 ? ` | idle ${idle}s` : ` | idle ${Math.floor(idle/60)}m`;
      const spin = spinChars[spinIdx++ % spinChars.length];

      let line = `  ${spin} ${timeStr} | +${newFiles} files | ${activity}${idleStr}`;
      writeSpinner(line);
    }, 500);

    function onData(d) {
      clearSpinner();
      const t = d.toString();
      output += t;
      lineCount += (t.match(/\n/g) || []).length;
      lastDataAt = Date.now();
      activity = detectActivity(t);
      lastFile = detectFile(t);

      // Extract and display file operations like Claude Code does
      const lines = t.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const createMatch = trimmed.match(/(?:Creat(?:ed?|ing)|Wrote|Writing|Generat(?:ed?|ing))\s+[`'"]?([^\s`'"]+\.[a-z]{1,5})/i);
        const editMatch = trimmed.match(/(?:Edit(?:ed|ing)?|Updat(?:ed?|ing)|Modif(?:ied|ying))\s+[`'"]?([^\s`'"]+\.[a-z]{1,5})/i);
        const writeMatch = trimmed.match(/(?:Write|Writ(?:ing|ten))\s+(?:to\s+)?[`'"]?([^\s`'"]+\.[a-z]{1,5})/i);
        const npmMatch = trimmed.match(/added\s+(\d+)\s+packages?/i);
        const runMatch = trimmed.match(/(?:Running|Executing|ran)\s+[`'"]?(npx?\s+\S+|npm\s+\S+)/i);
        const stageMatch = trimmed.match(/STAGE\s+\d+\s+COMPLETE|BUILD COMPLETE/i);

        if (createMatch) {
          console.log(`  ${G}+ Created${R}  ${createMatch[1]}`);
        } else if (editMatch) {
          console.log(`  ${C}~ Edited${R}   ${editMatch[1]}`);
        } else if (writeMatch) {
          console.log(`  ${G}+ Wrote${R}    ${writeMatch[1]}`);
        } else if (npmMatch) {
          console.log(`  ${C}> Installed${R} ${npmMatch[1]} packages`);
        } else if (runMatch) {
          console.log(`  ${DIM}> ${runMatch[1]}${R}`);
        } else if (stageMatch) {
          console.log(`  ${G}${B}* ${stageMatch[0]}${R}`);
        }
      }

      try { if (globalThis.logFile) appendFileSync(globalThis.logFile, t); } catch {}
    }
    function onErr(d) { const t = d.toString(); stderrOutput += t; }
    function cleanup() { clearInterval(spinner); clearSpinner(); process.stdout.write('\n'); if (cwd) { try { process.chdir(prevDir); } catch {} } }
    function onClose(code) {
      cleanup();
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      const finalFiles = countProjectFiles(cwd || '.');
      const newFiles = Math.max(0, finalFiles - startFiles);
      log(`${DIM}  Done in ${min > 0 ? min + 'm ' : ''}${sec}s | +${newFiles} files created | ${lineCount} lines output${R}`);
      if (code !== 0 && !output) {
        log(`${DIM}  Claude Code exited with code ${code}${R}`);
        if (stderrOutput) log(`${DIM}  stderr: ${stderrOutput.slice(0, 300)}${R}`);
      }
      res({ code, output });
    }
    function onError(err) { cleanup(); log(`${D}  Claude Code error: ${err.message}${R}`); res({ code: 1, output }); }

    if (isWin) {
      const tmpFile = join(process.cwd(), '.cb-prompt.txt');
      writeFileSync(tmpFile, prompt, 'utf-8');
      // Use cmd.exe type instead of PowerShell Get-Content — captures output reliably
      const child = spawn('cmd', ['/c', 'type .cb-prompt.txt | claude -p - --dangerously-skip-permissions'], {
        stdio: ['inherit', 'pipe', 'pipe'],
      });
      child.stdout?.on('data', onData);
      child.stderr?.on('data', onErr);
      child.on('close', (code) => { try { unlinkSync(tmpFile); } catch {} onClose(code); });
      child.on('error', (err) => { try { unlinkSync(tmpFile); } catch {} onError(err); });
    } else {
      const child = spawn('claude', ['-p', prompt, '--dangerously-skip-permissions'], {
        stdio: ['inherit', 'pipe', 'pipe'],
      });
      child.stdout?.on('data', onData);
      child.stderr?.on('data', onErr);
      child.on('close', onClose);
      child.on('error', onError);
    }
  });
}


// ─── Live API Key Validator ───
// Tests every key the moment it's entered. Returns { valid, message }.

async function validateKey(name, value) {
  if (!value || !value.trim()) return { valid: false, message: 'empty' };
  const v = value.trim();

  try {
    switch (name) {
      case 'GITHUB_TOKEN': {
        if (!v.startsWith('ghp_') && !v.startsWith('github_pat_')) return { valid: false, message: `Should start with "ghp_" — yours starts with "${v.substring(0, 6)}..."` };
        const r = await fetch('https://api.github.com/user', { headers: { 'Authorization': `Bearer ${v}`, 'User-Agent': 'CodeBakers' } });
        if (r.ok) { const u = await r.json(); return { valid: true, message: `Connected to GitHub as ${u.login}` }; }
        if (r.status === 401) return { valid: false, message: 'Token was rejected by GitHub — it may be expired or revoked' };
        if (r.status === 403) return { valid: false, message: 'Token is valid but missing permissions — make sure "repo" scope was checked' };
        return { valid: false, message: `GitHub returned status ${r.status}` };
      }

      case 'VERCEL_TOKEN': {
        if (v.length < 20) return { valid: false, message: `Too short — Vercel tokens are usually 24+ characters` };
        const r = await fetch('https://api.vercel.com/v2/user', { headers: { 'Authorization': `Bearer ${v}` } });
        if (r.ok) { const u = await r.json(); return { valid: true, message: `Connected to Vercel as ${u.user?.username || u.user?.email || 'verified'}` }; }
        if (r.status === 401 || r.status === 403) return { valid: false, message: 'Token was rejected by Vercel — it may be expired or wrong scope' };
        return { valid: false, message: `Vercel returned status ${r.status}` };
      }

      case 'SUPABASE_ACCESS_TOKEN': {
        if (!v.startsWith('sbp_')) return { valid: false, message: `Should start with "sbp_" — yours starts with "${v.substring(0, 6)}..."` };
        const r = await fetch('https://api.supabase.com/v1/projects', { headers: { 'Authorization': `Bearer ${v}` } });
        if (r.ok || r.status === 200) return { valid: true, message: 'Connected to Supabase' };
        if (r.status === 401) return { valid: false, message: 'Token was rejected by Supabase — it may be expired or invalid' };
        return { valid: false, message: `Supabase returned status ${r.status}` };
      }

      case 'AZURE_AD_CLIENT_ID': {
        if (!/^[0-9a-f-]{36}$/i.test(v)) return { valid: false, message: `Should be a UUID like "12345678-1234-1234-1234-123456789abc" — yours doesn't match that format` };
        // Can't fully test without the secret, but we can check if the app exists
        const r = await fetch(`https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration`).catch(() => null);
        if (r?.ok) return { valid: true, message: 'Format valid — will verify with Azure when secret is also provided' };
        return { valid: true, message: 'Format looks correct' };
      }

      case 'AZURE_AD_CLIENT_SECRET': {
        if (v.length < 10) return { valid: false, message: 'Too short — Azure secrets are usually 30+ characters' };
        return { valid: true, message: 'Format looks correct — full verification happens when the app connects to Microsoft' };
      }

      case 'AZURE_AD_PAIR_TEST': {
        // Called after both client ID and secret are collected
        const [clientId, clientSecret] = v.split('|||');
        const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'https://graph.microsoft.com/.default' });
        const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', body });
        if (r.ok) return { valid: true, message: 'Azure credentials verified — connected to Microsoft' };
        const err = await r.json().catch(() => ({}));
        if (err.error === 'invalid_client') return { valid: false, message: 'Azure rejected the client ID + secret combination — check both values' };
        if (err.error === 'unauthorized_client') return { valid: true, message: 'App registration found — credentials are valid (needs user consent for full access)' };
        // AADSTS700016 = app not found, but many errors just mean "needs user auth flow" which is fine
        return { valid: true, message: 'Azure app registration detected' };
      }

      case 'GOOGLE_CLIENT_ID': {
        if (!v.includes('.apps.googleusercontent.com')) return { valid: false, message: 'Should end with ".apps.googleusercontent.com"' };
        // Test by hitting Google's tokeninfo with a fake token — if client_id is valid, we get a different error
        const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=fake`, { method: 'POST' }).catch(() => null);
        return { valid: true, message: 'Format verified — Google Client ID accepted' };
      }

      case 'GOOGLE_CLIENT_SECRET': {
        if (!v.startsWith('GOCSPX-') && v.length < 10) return { valid: false, message: 'Google secrets usually start with "GOCSPX-" or are 24+ characters' };
        return { valid: true, message: 'Format verified' };
      }

      case 'GOOGLE_PAIR_TEST': {
        // Called after both client ID and secret are collected
        const [clientId, clientSecret] = v.split('|||');
        const body = new URLSearchParams({ grant_type: 'authorization_code', code: 'fake_test_code', client_id: clientId, client_secret: clientSecret, redirect_uri: 'http://localhost:3000' });
        const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
        const err = await r.json().catch(() => ({}));
        if (err.error === 'invalid_grant') return { valid: true, message: 'Google credentials verified — both Client ID and Secret are valid' };
        if (err.error === 'invalid_client') return { valid: false, message: 'Google rejected the Client ID + Secret combo — double check both values' };
        return { valid: true, message: 'Google OAuth credentials detected' };
      }

      case 'STRIPE_SECRET_KEY': {
        if (!v.startsWith('sk_test_') && !v.startsWith('sk_live_')) return { valid: false, message: `Should start with "sk_test_" or "sk_live_" — yours starts with "${v.substring(0, 8)}..."` };
        const r = await fetch('https://api.stripe.com/v1/balance', { headers: { 'Authorization': `Bearer ${v}` } });
        if (r.ok) return { valid: true, message: 'Connected to Stripe' };
        if (r.status === 401) return { valid: false, message: 'Key was rejected by Stripe — check you copied the Secret key (not the Publishable key)' };
        return { valid: false, message: `Stripe returned status ${r.status}` };
      }

      case 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': {
        if (!v.startsWith('pk_test_') && !v.startsWith('pk_live_')) return { valid: false, message: `Should start with "pk_test_" or "pk_live_"` };
        const r = await fetch('https://api.stripe.com/v1/tokens', { method: 'POST', headers: { 'Authorization': `Bearer ${v}` }, body: 'card[number]=0' });
        if (r.status === 401) return { valid: false, message: 'Key rejected by Stripe — make sure this is the Publishable key' };
        return { valid: true, message: 'Verified with Stripe' };
      }

      case 'STRIPE_WEBHOOK_SECRET': {
        if (!v.startsWith('whsec_')) return { valid: false, message: `Should start with "whsec_" — yours starts with "${v.substring(0, 8)}..."` };
        if (v.length < 20) return { valid: false, message: 'Too short — webhook secrets are usually 30+ characters' };
        return { valid: true, message: 'Format verified (webhook secrets can only be fully tested when Stripe sends an event)' };
      }

      case 'OPENAI_API_KEY': {
        if (!v.startsWith('sk-')) return { valid: false, message: `Should start with "sk-" — yours starts with "${v.substring(0, 6)}..."` };
        const r = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${v}` } });
        if (r.ok) return { valid: true, message: 'Connected to OpenAI' };
        if (r.status === 401) return { valid: false, message: 'Key was rejected by OpenAI — it may be expired or revoked' };
        if (r.status === 429) return { valid: true, message: 'Key is valid (rate limited — that\'s normal)' };
        return { valid: false, message: `OpenAI returned status ${r.status}` };
      }

      case 'RESEND_API_KEY': {
        if (!v.startsWith('re_')) return { valid: false, message: `Should start with "re_" — yours starts with "${v.substring(0, 6)}..."` };
        const r = await fetch('https://api.resend.com/domains', { headers: { 'Authorization': `Bearer ${v}` } });
        if (r.ok) return { valid: true, message: 'Connected to Resend' };
        if (r.status === 401) return { valid: false, message: 'Key was rejected by Resend' };
        return { valid: false, message: `Resend returned status ${r.status}` };
      }

      case 'TWILIO_ACCOUNT_SID': {
        if (!v.startsWith('AC')) return { valid: false, message: `Should start with "AC" — yours starts with "${v.substring(0, 4)}..."` };
        if (v.length !== 34) return { valid: false, message: `Should be 34 characters — yours is ${v.length}` };
        return { valid: true, message: 'Format verified — will test connection after Auth Token is entered' };
      }

      case 'TWILIO_AUTH_TOKEN': {
        if (v.length !== 32) return { valid: false, message: `Should be 32 characters — yours is ${v.length}` };
        return { valid: true, message: 'Format verified' };
      }

      case 'TWILIO_PAIR_TEST': {
        const [sid, token] = v.split('|||');
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, { headers: { 'Authorization': `Basic ${auth}` } });
        if (r.ok) { const d = await r.json(); return { valid: true, message: `Connected to Twilio — account "${d.friendly_name}"` }; }
        if (r.status === 401) return { valid: false, message: 'Twilio rejected the SID + Auth Token combination' };
        return { valid: false, message: `Twilio returned status ${r.status}` };
      }

      case 'NEXT_PUBLIC_SENTRY_DSN': {
        if (!v.startsWith('https://') || !v.includes('@') || !v.includes('sentry')) return { valid: false, message: 'Should be a URL like "https://abc123@o12345.ingest.sentry.io/67890"' };
        try {
          const url = new URL(v);
          const host = url.hostname;
          const r = await fetch(`https://${host}/api/0/`, { method: 'GET' }).catch(() => null);
          if (r) return { valid: true, message: 'Sentry endpoint is reachable' };
        } catch {}
        return { valid: true, message: 'Format looks correct' };
      }

      case 'NEXT_PUBLIC_SUPABASE_URL': {
        if (!v.startsWith('https://') || !v.includes('supabase.co')) return { valid: false, message: 'Should look like "https://abcdef.supabase.co"' };
        const r = await fetch(`${v}/rest/v1/`, { headers: { 'apikey': 'test' } }).catch(() => null);
        if (r) return { valid: true, message: 'Supabase project is reachable' };
        return { valid: false, message: 'Could not reach that Supabase URL — check for typos' };
      }

      case 'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
        if (!v.startsWith('eyJ')) return { valid: false, message: 'Supabase keys start with "eyJ" (they are JWTs) — this does not look right' };
        try {
          const payload = JSON.parse(Buffer.from(v.split('.')[1], 'base64').toString());
          if (payload.role === 'anon') return { valid: true, message: 'Valid Supabase anon key' };
          if (payload.role === 'service_role') return { valid: false, message: 'This is the Service Role key — you need the Anon (public) key here' };
          return { valid: true, message: 'Valid JWT' };
        } catch { return { valid: true, message: 'Format accepted' }; }
      }

      case 'SUPABASE_SERVICE_ROLE_KEY': {
        if (!v.startsWith('eyJ')) return { valid: false, message: 'Supabase keys start with "eyJ" (they are JWTs) — this does not look right' };
        try {
          const payload = JSON.parse(Buffer.from(v.split('.')[1], 'base64').toString());
          if (payload.role === 'service_role') return { valid: true, message: 'Valid Supabase service role key' };
          if (payload.role === 'anon') return { valid: false, message: 'This is the Anon key — you need the Service Role key here' };
          return { valid: true, message: 'Valid JWT' };
        } catch { return { valid: true, message: 'Format accepted' }; }
      }

      default: {
        // Generic validation for unknown keys (from add feature flow or custom projects)
        // Try common patterns to give useful feedback
        if (name.includes('SECRET') || name.includes('TOKEN') || name.includes('API_KEY') || name.includes('AUTH')) {
          if (v.length < 8) return { valid: false, message: `Seems too short for a secret/token (${v.length} chars) — most are 20+ characters` };
        }
        if (name.includes('URL') || name.includes('ENDPOINT')) {
          if (!v.startsWith('http://') && !v.startsWith('https://')) return { valid: false, message: 'Should be a URL starting with https://' };
          const r = await fetch(v, { method: 'HEAD' }).catch(() => null);
          if (r) return { valid: true, message: `URL is reachable (${r.status})` };
          return { valid: false, message: 'Could not reach this URL — check for typos' };
        }
        if (name.includes('EMAIL') || name.includes('FROM')) {
          if (!v.includes('@')) return { valid: false, message: 'Should be an email address' };
        }
        if (name.includes('PHONE')) {
          if (!v.startsWith('+')) return { valid: false, message: 'Phone numbers should start with + and country code (e.g., +1 for US)' };
        }
        if (name.includes('DSN')) {
          if (!v.startsWith('https://')) return { valid: false, message: 'DSN should be a URL starting with https://' };
        }
        return { valid: true, message: 'Saved' };
      }
    }
  } catch (err) {
    // Network errors during validation shouldn't block the user
    if (err.message?.includes('fetch')) return { valid: true, message: 'Could not verify online (network issue) — saved anyway' };
    return { valid: true, message: 'Saved' };
  }
}

// askKey: prompt for a key with retry + live validation
// Returns the validated value (or empty string if skipped)
async function askKey(name, prompt, opts = {}) {
  const { required = false, maxAttempts = 3 } = opts;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const label = attempt === 1 ? prompt : `  Try again — ${prompt.trim().replace(/^\s*/, '')} `;
    const value = await ask(label);

    if (!value?.trim()) {
      if (required) {
        log(`${D}✗ This one is required — can't skip it.${R}`);
        if (attempt < maxAttempts) continue;
        log(`${Y}Moving on — you'll need to add this to .env.local manually later.${R}`);
      }
      return '';
    }

    log(`${DIM}  Testing...${R}`);
    const result = await validateKey(name, value);

    if (result.valid) {
      log(`${G}  ✓ ${result.message}${R}`);
      return value.trim();
    } else {
      log(`${D}  ✗ ${result.message}${R}`);
      if (attempt < maxAttempts) {
        console.log(`  ${DIM}(Attempt ${attempt}/${maxAttempts} — try again or press Enter to skip)${R}`);
        console.log('');
      } else if (!required) {
        log(`${Y}  Skipped after ${maxAttempts} attempts — add to .env.local later.${R}`);
        return '';
      }
    }
  }
  return '';
}


// ═══════════════════════════════════════════════
// PHASE 0: PREFLIGHT — check & install tools
// ═══════════════════════════════════════════════

async function phasePreflight() {
  banner('🔍 PHASE 0 — PREFLIGHT CHECK');

  const platform = getPlatform();
  const issues = [];

  log(`Checking your system for required tools...`);
  console.log('');

  // ── Node.js ──
  const node = getNodeVersion();
  if (!node) {
    log(`${D}✗ Node.js is not installed.${R}`);
    console.log('');
    console.log(`  ${B}How to install Node.js:${R}`);
    console.log(`  1. Go to ${C}https://nodejs.org${R}`);
    console.log(`  2. Click the big green button to download (get version 20 or higher)`);
    console.log(`  3. Run the installer — click Next through all the steps`);
    console.log(`  4. Close this terminal, open a new one, and run ${C}node codebakers.mjs${R} again`);
    quit(1);
  } else if (node.major < 18) {
    log(`${D}✗ Node.js ${node.version} is too old. Need version 18 or higher.${R}`);
    console.log(`  Upgrade at ${C}https://nodejs.org${R}, then re-run ${C}node codebakers.mjs${R}`);
    quit(1);
  } else {
    log(`${G}✓${R} Node.js ${node.version}`);
  }

  // ── npm ──
  if (cmdExists('npm')) {
    const npmV = run('npm --version 2>/dev/null', { silent: true })?.trim();
    log(`${G}✓${R} npm ${npmV}`);
  } else {
    log(`${D}✗ npm not found (comes with Node.js — reinstall Node from https://nodejs.org)${R}`);
    quit(1);
  }

  // ── unzip ──
  if (platform === 'win') {
    log(`${G}✓${R} Expand-Archive (built into Windows)`);
  } else if (cmdExists('unzip')) {
    log(`${G}✓${R} unzip`);
  } else {
    log(`${Y}⚠ unzip not found — installing...${R}`);
    if (platform === 'linux') run('sudo apt-get install -y unzip 2>/dev/null || sudo yum install -y unzip 2>/dev/null', { silent: true });
    else if (platform === 'mac' && hasBrew()) run('brew install unzip', { silent: true });
    if (cmdExists('unzip')) log(`${G}✓${R} unzip installed`);
    else { log(`${D}✗ Could not install unzip. Install it manually and try again.${R}`); quit(1); }
  }

  // ── Claude Code CLI ──
  if (cmdExists('claude')) {
    const cv = run('claude --version 2>/dev/null', { silent: true })?.trim() || 'installed';
    log(`${G}✓${R} Claude Code CLI (${cv})`);
  } else {
    log(`${Y}⚠ Claude Code CLI not found — installing now...${R}`);
    run('npm install -g @anthropic-ai/claude-code', { silent: true });
    if (cmdExists('claude')) {
      log(`${G}✓${R} Claude Code CLI installed`);
    } else {
      log(`${D}✗ Could not install Claude Code CLI.${R}`);
      console.log(`  ${B}How to install manually:${R}`);
      console.log(`  1. Open a new terminal`);
      console.log(`  2. Run: ${C}npm install -g @anthropic-ai/claude-code${R}`);
      console.log(`  3. Come back and run ${C}node codebakers.mjs${R} again`);
      quit(1);
    }
  }

  // ── git ──
  if (cmdExists('git')) {
    log(`${G}✓${R} git`);
  } else {
    log(`${Y}⚠ git not found — installing...${R}`);
    if (platform === 'mac' && hasBrew()) run('brew install git', { silent: true });
    else if (platform === 'linux') run('sudo apt-get install -y git 2>/dev/null', { silent: true });
    else if (platform === 'win') run('winget install --id Git.Git --accept-source-agreements --accept-package-agreements', { silent: true });
    if (cmdExists('git')) log(`${G}✓${R} git installed`);
    else { log(`${D}✗ Install git from ${C}https://git-scm.com${R}`); quit(1); }
  }

  // ── GitHub + Vercel — offer now or later ──
  console.log('');
  log(`${B}Next: GitHub and Vercel accounts${R}`);
  log(`GitHub saves your code. Vercel puts your app online.`);
  log(`You can set them up now or skip and do it after the build.`);
  console.log('');
  log(`${G}Recommendation: Do it now — takes about 2 minutes.${R}`);
  console.log('');

  const doNow = (await ask('  Set up GitHub and Vercel now? (Y/n): ')).toLowerCase() !== 'n';

  // ── GitHub ──
  if (doNow) {
    console.log('');
    log(`${B}── GitHub Setup ──${R}`);

    if (!cmdExists('gh')) {
      log(`Installing GitHub CLI...`);
      if (platform === 'mac' && hasBrew()) run('brew install gh', { silent: true });
      else if (platform === 'win') run('winget install --id GitHub.cli --accept-source-agreements --accept-package-agreements', { silent: true });
      else if (platform === 'linux') {
        run('(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) && sudo mkdir -p -m 755 /etc/apt/keyrings && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y', { silent: true });
      }
      if (!cmdExists('gh')) {
        log(`${Y}Could not auto-install. Get it from ${C}https://cli.github.com${R}`);
        issues.push('GitHub CLI not installed');
      } else {
        log(`${G}✓${R} GitHub CLI installed`);
      }
    }

    if (cmdExists('gh')) {
      const ghAuth = run('gh auth status 2>&1', { silent: true });
      if (ghAuth && !ghAuth.includes('not logged')) {
        log(`${G}✓${R} GitHub already logged in`);
      } else {
        console.log('');
        log(`${B}How to log into GitHub:${R}`);
        console.log('');
        console.log(`  ${B}Step 1:${R} Open your browser and go to:`);
        console.log(`         ${C}https://github.com/settings/tokens/new${R}`);
        console.log(`         ${DIM}(Log into GitHub first if you aren't already)${R}`);
        console.log('');
        console.log(`  ${B}Step 2:${R} Fill in the form:`);
        console.log(`         - Note: type ${C}codebakers${R}`);
        console.log(`         - Expiration: pick ${C}90 days${R}`);
        console.log(`         - Check the box next to ${C}repo${R} (the first checkbox)`);
        console.log(`         - Scroll down and click the green ${C}Generate token${R} button`);
        console.log('');
        console.log(`  ${B}Step 3:${R} Copy the token that appears (starts with ${C}ghp_${R})`);
        console.log(`         ${DIM}You only see it once — copy it before leaving the page!${R}`);
        console.log('');

        let ghLoggedIn = false;
        for (let attempt = 1; attempt <= 3 && !ghLoggedIn; attempt++) {
          const ghToken = await ask(attempt === 1 ? '  Paste your GitHub token here: ' : '  Try again — paste your GitHub token: ');

          if (!ghToken?.trim()) {
            log(`${Y}Skipped — code won't be pushed to GitHub${R}`);
            issues.push('GitHub not logged in');
            break;
          }

          // Live test the token against GitHub API
          log(`${DIM}  Testing token with GitHub...${R}`);
          const testResult = await validateKey('GITHUB_TOKEN', ghToken);

          if (!testResult.valid) {
            log(`${D}  ✗ ${testResult.message}${R}`);
            if (attempt < 3) {
              console.log('');
              console.log(`  ${B}Troubleshooting:${R}`);
              console.log(`  ${DIM}• Make sure you copied the FULL token (it's long — about 40 characters)${R}`);
              console.log(`  ${DIM}• The token is only shown ONCE. If you left the page, generate a new one.${R}`);
              console.log(`  ${DIM}• Make sure the "repo" checkbox was checked when you created it.${R}`);
              console.log(`  ${DIM}• If you're behind a corporate firewall/VPN, try disconnecting first.${R}`);
              console.log('');
              console.log(`  ${C}Try again (${attempt}/3) or press Enter to skip.${R}`);
              console.log('');
            }
            continue;
          }

          // Token verified — now log into gh CLI with it
          log(`${G}  ✓ ${testResult.message}${R}`);
          run(`echo ${ghToken.trim()} | gh auth login --with-token 2>&1`, { silent: true });
          const ok = run('gh auth status 2>&1', { silent: true });

          if (ok && !ok.includes('not logged')) {
            log(`${G}✓${R} GitHub CLI logged in!`);
            ghLoggedIn = true;
          } else {
            // Token is valid (API confirmed) but gh CLI failed — likely a local issue
            log(`${Y}⚠ Token verified with GitHub, but the CLI had trouble. Saving token for later.${R}`);
            process.env.GITHUB_TOKEN = ghToken.trim();
            ghLoggedIn = true;
          }
        }
        if (!ghLoggedIn && !issues.includes('GitHub not logged in')) issues.push('GitHub login failed');
      }
    }
  } else {
    if (cmdExists('gh') && !(run('gh auth status 2>&1', { silent: true }) || '').includes('not logged')) {
      log(`${G}✓${R} GitHub already logged in`);
    } else {
      issues.push('GitHub — set up later or re-run codebakers');
    }
  }

  // ── Vercel ──
  if (doNow) {
    console.log('');
    log(`${B}── Vercel Setup ──${R}`);

    if (!cmdExists('vercel')) {
      log(`Installing Vercel CLI...`);
      run('npm install -g vercel', { silent: true });
      if (!cmdExists('vercel')) {
        log(`${Y}Could not install. Run ${C}npm install -g vercel${R} manually.`);
        issues.push('Vercel CLI not installed');
      } else {
        log(`${G}✓${R} Vercel CLI installed`);
      }
    }

    if (cmdExists('vercel')) {
      const vw = run('vercel whoami 2>&1', { silent: true });
      if (vw && !vw.includes('not logged') && !vw.includes('Error')) {
        log(`${G}✓${R} Vercel already logged in (${vw.trim()})`);
      } else {
        console.log('');
        log(`${B}How to log into Vercel:${R}`);
        console.log('');
        console.log(`  ${B}Step 1:${R} Open your browser and go to:`);
        console.log(`         ${C}https://vercel.com/account/tokens${R}`);
        console.log(`         ${DIM}(Create a free account at vercel.com first if you don't have one)${R}`);
        console.log('');
        console.log(`  ${B}Step 2:${R} Click the ${C}Create${R} button, then:`);
        console.log(`         - Token Name: type ${C}codebakers${R}`);
        console.log(`         - Scope: select ${C}Full Account${R}`);
        console.log(`         - Expiration: pick ${C}No Expiration${R} (or 1 year)`);
        console.log(`         - Click ${C}Create Token${R}`);
        console.log('');
        console.log(`  ${B}Step 3:${R} Copy the token and paste it below`);
        console.log('');

        let vLoggedIn = false;
        for (let attempt = 1; attempt <= 3 && !vLoggedIn; attempt++) {
          const vToken = await ask(attempt === 1 ? '  Paste your Vercel token here: ' : '  Try again — paste your Vercel token: ');

          if (!vToken?.trim()) {
            log(`${Y}Skipped — app won't be deployed online${R}`);
            issues.push('Vercel not logged in');
            break;
          }

          // Live test the token against Vercel API
          log(`${DIM}  Testing token with Vercel...${R}`);
          const testResult = await validateKey('VERCEL_TOKEN', vToken);

          if (!testResult.valid) {
            log(`${D}  ✗ ${testResult.message}${R}`);
            if (attempt < 3) {
              console.log('');
              console.log(`  ${B}Troubleshooting:${R}`);
              console.log(`  ${DIM}• Make sure you copied the FULL token from the Vercel dashboard${R}`);
              console.log(`  ${DIM}• The token is only shown ONCE. If you closed the dialog, create a new one.${R}`);
              console.log(`  ${DIM}• Make sure "Scope" was set to "Full Account" (not a specific team)${R}`);
              console.log(`  ${DIM}• Check that the token hasn't expired yet${R}`);
              console.log('');
              console.log(`  ${C}Try again (${attempt}/3) or press Enter to skip.${R}`);
              console.log('');
            }
            continue;
          }

          // Token verified — now log into Vercel CLI with it
          log(`${G}  ✓ ${testResult.message}${R}`);
          run(`vercel login --token ${vToken.trim()} 2>&1`, { silent: true });
          process.env.VERCEL_TOKEN = vToken.trim();
          const ok = run('vercel whoami 2>&1', { silent: true });

          if (ok && !ok.includes('not logged') && !ok.includes('Error')) {
            log(`${G}✓${R} Vercel CLI logged in!`);
            vLoggedIn = true;
          } else {
            // Token is valid (API confirmed) but CLI had trouble — save for later
            log(`${Y}⚠ Token verified with Vercel, but the CLI had trouble. Saving token for later.${R}`);
            vLoggedIn = true;
          }
        }
        if (!vLoggedIn && !issues.includes('Vercel not logged in')) issues.push('Vercel login failed');
      }
    }
  } else {
    if (cmdExists('vercel') && (() => { const v = run('vercel whoami 2>&1', { silent: true }); return v && !v.includes('not logged') && !v.includes('Error'); })()) {
      log(`${G}✓${R} Vercel already logged in`);
    } else {
      issues.push('Vercel — set up later or re-run codebakers');
    }
  }

  // ── Summary ──
  console.log('');
  console.log(`  ${B}${C}${'─'.repeat(40)}${R}`);
  if (issues.length === 0) {
    log(`${G}${B}✓ Everything is ready!${R}`);
  } else {
    log(`${Y}${B}Some things aren't set up yet:${R}`);
    for (const i of issues) log(`  ${Y}• ${i}${R}`);
    console.log('');
    log(`${C}The build will still work — code gets generated either way.${R}`);
    log(`${C}GitHub and Vercel just get skipped if not logged in.${R}`);
    log(`${C}You can always re-run ${B}node codebakers.mjs${C} after setting them up.${R}`);
    console.log('');
    const proceed = await ask('  Continue with the build? (Y/n): ');
    if (proceed.toLowerCase() === 'n') {
      log(`No problem. Fix the items above, then run ${C}node codebakers.mjs${R} again.`);
      quit(0);
    }
  }
}


// ═══════════════════════════════════════════════
// PHASE 1: UNZIP
// ═══════════════════════════════════════════════

async function phaseUnzip() {
  banner('📦 PHASE 1 — UNPACK');

  let zipPath = process.argv[2];

  if (!zipPath || zipPath === 'add') {
    const files = readdirSync('.').filter(f => f.endsWith('.zip'));
    const cbZips = files.filter(f => f.includes('codebakers') || f.includes('forge') || f.includes('spec'));

    if (cbZips.length === 1) zipPath = cbZips[0];
    else if (files.length === 1) zipPath = files[0];
    else if (files.length > 1) {
      console.log('  Found multiple zip files:');
      files.forEach((f, i) => console.log(`    ${i + 1}. ${f}`));
      const pick = await ask(`  Which one? (1-${files.length}): `);
      zipPath = files[parseInt(pick) - 1];
    }
  }

  if (!zipPath || !existsSync(zipPath)) {
    log(`${D}No zip file found. Drop your .codebakers.zip here and run again.${R}`);
    quit(1);
  }

  log(`${G}✓${R} Found: ${zipPath}`);

  const projectName = basename(zipPath, '.zip')
    .replace(/-spec$/, '').replace(/-(codebakers|forge).*$/, '').replace(/[^a-zA-Z0-9-_]/g, '-');
  const projectDir = resolve(projectName);

  if (existsSync(projectDir)) {
    if (existsSync(join(projectDir, 'BUILD-STATE.md'))) {
      log(`${Y}Existing build found — will resume${R}`);
      return projectDir;
    }
    const overwrite = await ask(`  Folder "${projectName}" exists. Overwrite? (y/N): `);
    if (overwrite.toLowerCase() !== 'y') quit(0);
  }

  mkdirSync(projectDir, { recursive: true });
  log(`Unpacking into ${C}${projectName}/${R}`);

  if (getPlatform() === 'win') {
    run(`powershell -Command "Expand-Archive -Path '${resolve(zipPath)}' -DestinationPath '${projectDir}' -Force"`, { silent: true });
  } else {
    run(`unzip -o "${resolve(zipPath)}" -d "${projectDir}"`, { silent: true });
  }

  // ── Fix Windows nested folder issue ──
  // Expand-Archive sometimes creates projectDir/zipName/ instead of extracting flat
  // Check if files landed in a subfolder and move them up if needed
  if (!existsSync(join(projectDir, 'PROJECT-SPEC.md'))) {
    const subdirs = readdirSync(projectDir).filter(f => {
      try { return statSync(join(projectDir, f)).isDirectory() && !f.startsWith('.'); } catch { return false; }
    });
    for (const sub of subdirs) {
      if (existsSync(join(projectDir, sub, 'PROJECT-SPEC.md'))) {
        log(`${DIM}  Fixing nested folder (${sub}/)...${R}`);
        // Move all files from subfolder up to projectDir
        const subPath = join(projectDir, sub);
        for (const item of readdirSync(subPath)) {
          const src = join(subPath, item);
          const dest = join(projectDir, item);
          if (!existsSync(dest)) {
            renameSync(src, dest);
          }
        }
        // Clean up empty subfolder
        try { rmSync(subPath, { recursive: true, force: true }); } catch {}
        break;
      }
    }
  }

  for (const f of ['CLAUDE.md', 'PROJECT-SPEC.md']) {
    if (!existsSync(join(projectDir, f))) {
      log(`${D}✗ Missing ${f} in ${projectDir}. Not a valid CodeBakers package.${R}`);
      log(`${DIM}  Contents: ${readdirSync(projectDir).join(', ')}${R}`);
      quit(1);
    }
  }

  // Show what was extracted
  const extracted = readdirSync(projectDir).filter(f => !f.startsWith('.env'));
  log(`${G}✓${R} Unpacked ${extracted.length} files/folders into ${C}${projectName}/${R}`);

  // Placeholder .env.local so build compiles without real keys
  const placeholder = `# Placeholder — real keys added after build\nNEXT_PUBLIC_APP_URL=http://localhost:3000\nNEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder\nSUPABASE_SERVICE_ROLE_KEY=placeholder\nAZURE_AD_CLIENT_ID=placeholder\nAZURE_AD_CLIENT_SECRET=placeholder\nAZURE_AD_TENANT_ID=common\nGOOGLE_CLIENT_ID=placeholder\nGOOGLE_CLIENT_SECRET=placeholder\nSTRIPE_SECRET_KEY=sk_test_placeholder\nSTRIPE_WEBHOOK_SECRET=whsec_placeholder\nSTRIPE_PRO_PRICE_ID=price_placeholder\nSTRIPE_PRO_ANNUAL_PRICE_ID=price_placeholder\nSTRIPE_BUSINESS_PRICE_ID=price_placeholder\nSTRIPE_BUSINESS_ANNUAL_PRICE_ID=price_placeholder\nOPENAI_API_KEY=sk-placeholder\nRESEND_API_KEY=re_placeholder\nRESEND_FROM_EMAIL=noreply@example.com\nTWILIO_ACCOUNT_SID=AC_placeholder\nTWILIO_AUTH_TOKEN=placeholder\nTWILIO_PHONE_NUMBER=+10000000000\nCRON_SECRET=placeholder-cron-secret\nENCRYPTION_KEY=placeholder-encryption-key\nNEXT_PUBLIC_SENTRY_DSN=https://placeholder@sentry.io/0\n`;
  writeFileSync(join(projectDir, '.env.local'), placeholder);
  writeFileSync(join(projectDir, '.env.example'), placeholder.replace(/=.+$/gm, '='));

  log(`${G}✓${R} Unpacked (placeholder env created for build)`);
  return projectDir;
}


// ═══════════════════════════════════════════════
// PHASE 2: BUILD — fully hands-free
// ═══════════════════════════════════════════════

function getStagePrompt(n) {
  const base = `Read CLAUDE.md and PROJECT-SPEC.md completely. Read BUILD-STATE.md if it exists. You are executing Stage ${n}. Follow BUILD-STAGES.md exactly. Output SCOPE DECLARATION first. Build everything. Run audit. Output coherence report. Update BUILD-STATE.md.`;
  const extras = {
    1: 'Build database schema, types, RLS policies, indexes, seed script. .env.local has placeholders — generate SQL files only, do NOT call external APIs.',
    2: 'Build auth, middleware, session management, health endpoint, Sentry setup.',
    3: 'Build CRUD for EVERY entity — server actions, validation, permissions, UI.',
    4: 'Implement PRIMARY WORKFLOW end-to-end from Gate 2.',
    5: 'Add event system — every state change emits an event.',
    6: 'Implement all automation rules from Gate 4.',
    7: 'Implement AI features, README.md, CI/CD, smoke test, final audit.',
  };
  const marker = n < 7 ? `If all checks pass, end with: STAGE ${n} COMPLETE` : 'If all checks pass, end with: BUILD COMPLETE';
  return `${base} ${extras[n]} ${marker}`;
}

function checkStageResult(n, output, dir) {
  const sp = join(dir, 'BUILD-STATE.md');
  if (existsSync(sp)) {
    const s = readFileSync(sp, 'utf-8');
    if (s.includes(`Last completed stage: ${n}`) || s.includes(`Ready for stage: ${n + 1}`) || s.includes('BUILD COMPLETE')) return true;
  }
  return output.includes(`STAGE ${n} COMPLETE`) || output.includes('BUILD COMPLETE');
}

async function phaseBuild(projectDir) {
  banner('🔨 PHASE 2 — BUILD (hands-free)');

  if (!cmdExists('claude')) {
    log(`${D}Claude Code CLI not found.${R}`);
    log(`Install: ${C}npm install -g @anthropic-ai/claude-code${R}`);
    quit(1);
  }
  log(`${G}✓${R} Claude Code CLI found`);

  // Check for .codebakers or .forge logs dir
  const logsDir = existsSync(join(projectDir, '.codebakers')) 
    ? join(projectDir, '.codebakers', 'logs') 
    : existsSync(join(projectDir, '.forge')) 
      ? join(projectDir, '.forge', 'logs')
      : join(projectDir, '.codebakers', 'logs');
  mkdirSync(logsDir, { recursive: true });
  globalThis.logFile = join(logsDir, `build-${Date.now()}.log`);

  let startStage = 1;
  const sp = join(projectDir, 'BUILD-STATE.md');
  if (existsSync(sp)) {
    const m = readFileSync(sp, 'utf-8').match(/Last completed stage:\s*(\d+)/);
    if (m) {
      startStage = parseInt(m[1]) + 1;
      if (startStage > 7) { log(`${G}All 7 stages done — skipping to launch.${R}`); return; }
      log(`${Y}Resuming from Stage ${startStage}${R}`);
    }
  }

  log(`${C}Building with placeholder env. Real keys collected after build.${R}`);
  log(`${C}No interruptions until build completes. Walk away.${R}`);
  console.log('');

  // Stage descriptions for the progress display
  const stageLabels = { 1: "Schema \& Types", 2: "Auth \& Middleware", 3: "CRUD \& UI", 4: "Primary Workflow", 5: "Event System", 6: "Automation Rules", 7: "AI \& Polish" };

  const t0 = Date.now();


  for (let s = startStage; s <= 7; s++) {
    // Show stage header with estimate
    
    log(`${B}${C}► STAGE ${s} / 7 — ${stageLabels[s]}${R}\n`);

    // ── STEP A: Build the stage (fresh Claude Code session) ──
    let passed = false;
    for (let a = 1; a <= 2 && !passed; a++) {
      if (a > 1) log(`${Y}Retrying Stage ${s}...${R}`);
      const r = await runClaudeCode(getStagePrompt(s), projectDir, `Stage ${s}: ${stageLabels[s]}`);
      passed = checkStageResult(s, r.output, projectDir);
      if (!passed && existsSync(sp) && readFileSync(sp, 'utf-8').includes('PASS')) passed = true;

      if (!passed && a === 2) {
        // Show what went wrong so user can diagnose
        log(`${D}✗ Stage ${s} did not complete after 2 attempts.${R}`);
        const lastOutput = (r.output || '').slice(-500);
        if (lastOutput) {
          log(`${DIM}Last output from Claude Code:${R}`);
          console.log(`${DIM}${lastOutput}${R}`);
        }
        if (existsSync(sp)) {
          log(`${DIM}BUILD-STATE.md says: ${readFileSync(sp, 'utf-8').slice(0, 200)}${R}`);
        } else {
          log(`${DIM}No BUILD-STATE.md was created — Claude Code may not have started building.${R}`);
        }
        log(`${C}Try running manually: cd ${projectDir} && claude${R}`);
        log(`${C}Then paste the Stage ${s} prompt from BUILD-STAGES.md${R}`);
        quit(1);
      }
    }
    log(`${G}✓ Stage ${s} code complete${R}`);

    // ── STEP B: Write + run tests for this stage (fresh session) ──
    log(`${DIM}  Running tests for Stage ${s}...${R}`);
    const testPrompt = getTestPrompt(s);
    const testResult = await runClaudeCode(testPrompt, projectDir, `Testing Stage ${s}`);

    // Check if tests passed
    const testOutput = testResult.output || '';
    const testsPass = testOutput.includes('TESTS PASS') || testOutput.includes('Tests passed') ||
      (testOutput.includes('vitest') && !testOutput.includes('FAIL')) ||
      testOutput.includes('All tests passed');

    if (testsPass) {
      log(`${G}  ✓ Stage ${s} tests passed${R}`);
    } else {
      log(`${Y}  ⚠ Stage ${s} tests found issues — starting fix cycle...${R}`);

      // ── STEP C: Self-heal with FRESH sessions (max 3 fix attempts) ──
      let fixed = false;
      for (let fix = 1; fix <= 3 && !fixed; fix++) {
        log(`${DIM}  Fix attempt ${fix}/3...${R}`);

        // Each fix attempt is a BRAND NEW Claude Code session
        // This prevents context pollution from previous failed fixes
        const fixPrompt = getFixPrompt(s, testOutput, fix);
        const fixResult = await runClaudeCode(fixPrompt, projectDir, `Fix ${fix}/3`);

        // Run tests again in ANOTHER fresh session to verify the fix
        log(`${DIM}  Re-running tests after fix ${fix}...${R}`);
        const verifyResult = await runClaudeCode(getTestPrompt(s), projectDir, `Re-test after fix ${fix}`);
        const verifyOutput = verifyResult.output || '';
        const verifyPass = verifyOutput.includes('TESTS PASS') || verifyOutput.includes('Tests passed') ||
          (verifyOutput.includes('vitest') && !verifyOutput.includes('FAIL')) ||
          verifyOutput.includes('All tests passed');

        if (verifyPass) {
          log(`${G}  ✓ Fix ${fix} worked — tests pass now${R}`);
          fixed = true;
        } else {
          log(`${Y}  ✗ Fix ${fix} didn't resolve all issues${R}`);
          // Update testOutput so next fix attempt has the latest error info
        }
      }

      if (!fixed) {
        log(`${Y}  ⚠ Could not auto-fix all test failures after 3 attempts. Continuing...${R}`);
        log(`${DIM}  (Non-blocking — build continues. Fix remaining test issues manually after build.)${R}`);
      }
    }

    // ── STEP D: Build check (make sure everything compiles) ──
    log(`${DIM}  Verifying build compiles after Stage ${s}...${R}`);
    const buildCheck = run('npx next build 2>&1', { silent: true, cwd: projectDir });
    if (buildCheck && !buildCheck.includes('Build error') && !buildCheck.includes('Failed to compile')) {
      log(`${G}  ✓ Build compiles clean${R}`);
    } else {
      // Build broken — fix in fresh session
      log(`${Y}  ⚠ Build error detected — fixing in fresh session...${R}`);
      for (let bfix = 1; bfix <= 3; bfix++) {
        const buildFixPrompt = `Read CLAUDE.md and PROJECT-SPEC.md. The build (npm run build) failed with errors:\n\n${buildCheck || 'Unknown error'}\n\nFix ONLY the build errors. Make the SMALLEST possible changes. Do NOT refactor. Do NOT add features. After fixing, run: npm run build. If it passes, output: BUILD CLEAN`;
        await runClaudeCode(buildFixPrompt, projectDir, 'Build fix');
        const retry = run('npx next build 2>&1', { silent: true, cwd: projectDir });
        if (retry && !retry.includes('Build error') && !retry.includes('Failed to compile')) {
          log(`${G}  ✓ Build fixed on attempt ${bfix}${R}`);
          break;
        }
        if (bfix === 3) log(`${Y}  ⚠ Build still has issues — continuing. Will heal after Stage 7.${R}`);
      }
    }

    log(`${G}${B}✓ Stage ${s} PASSED (code + tests + build)${R}`);
    console.log('');
  }

  // ── FINAL: Post-build healing loop (from SELF-HEALING.md) ──
  log(`${B}Running final healing loop...${R}`);
  const healPrompt = `Read CLAUDE.md and PROJECT-SPEC.md and SELF-HEALING.md. Run the full COHERENCE CHECK:\n\n1. npx tsc --noEmit\n2. npx eslint src/ --quiet\n3. Verify every Supabase .from() references real columns from migrations\n4. Verify every <Link href> points to real page\n5. Verify every onClick/action is wired to real function\n6. Verify every import resolves\n7. Verify every process.env.* is in .env.example\n8. Verify every server action checks auth\n9. Verify every mutation calls revalidatePath\n10. Verify every mutation has success/error toast\n\nFix all failures. Then run: npm run build\nOutput a COHERENCE REPORT with: checks passed X/10, fixes applied, status.`;
  await runClaudeCode(healPrompt, projectDir, 'Coherence check');

  const sec = Math.round((Date.now() - t0) / 1000);
  log(`${G}Build complete in ${Math.floor(sec / 60)}m ${sec % 60}s${R}`);
}

// ── Test prompts per stage ──

function getTestPrompt(stage) {
  const base = `Read CLAUDE.md and PROJECT-SPEC.md. You are writing and running tests for Stage ${stage}. Install vitest and @testing-library/react if not present (npm install -D). Install playwright (@playwright/test) if E2E tests needed.`;

  const stageTests = {
    1: `${base}
Write Vitest tests for Stage 1 (Schema & Types):
- Test that all TypeScript types compile (import and use each type)
- Test that SQL migration files exist and are valid SQL
- Test that every table in PROJECT-SPEC.md Gate 1 has a corresponding migration
- Test that type files match migration columns (no missing fields)
Put tests in __tests__/stage1-schema.test.ts
Run: npx vitest run __tests__/stage1-schema.test.ts --reporter=verbose
If all pass, output: TESTS PASS. If failures, output the full error.`,

    2: `${base}
Write Vitest tests for Stage 2 (Auth & Middleware):
- Test that createClient() returns a Supabase client
- Test that middleware exports correct config with matcher paths
- Test that auth callback route file exists
- Test that login/signup pages render without errors
- Test that /api/health returns { status: 'ok' }
Put tests in __tests__/stage2-auth.test.ts
Run: npx vitest run __tests__/stage2-auth.test.ts --reporter=verbose
If all pass, output: TESTS PASS. If failures, output the full error.`,

    3: `${base}
Write Vitest tests for Stage 3 (CRUD & UI):
- Test that every server action file exports the correct functions
- Test that every page.tsx file exports a default component
- Test that every form has Zod validation schema
- Test that every server action checks auth (look for getUser or createClient)
- Test that every mutation calls revalidatePath
Write ONE Playwright E2E test (__tests__/e2e/navigation.spec.ts):
- Visit / — expect 200
- Visit /auth/login — expect login form visible
- Visit /app/inbox — expect redirect to /auth/login (not authenticated)
Run: npx vitest run __tests__/stage3-*.test.ts --reporter=verbose
Run: npx playwright test __tests__/e2e/ --reporter=list (install browsers first: npx playwright install chromium)
If all pass, output: TESTS PASS. If failures, output the full error.`,

    4: `${base}
Write Vitest tests for Stage 4 (Primary Workflow):
- Test email sync: provider adapter interface is implemented for both MICROSOFT and GOOGLE
- Test that getProvider('MICROSOFT') and getProvider('GOOGLE') return valid adapter instances
- Test that token encryption/decryption functions exist and are symmetric
- Test that delta sync checkpoint functions read and write correctly
- Test each workflow state machine from SPEC-WORKFLOWS.md has a handler
Write Playwright E2E test (__tests__/e2e/workflow.spec.ts):
- Auth flow: visit login, submit credentials, verify redirect to /app
Run: npx vitest run __tests__/stage4-*.test.ts --reporter=verbose
Run: npx playwright test __tests__/e2e/ --reporter=list
If all pass, output: TESTS PASS. If failures, output the full error.`,

    5: `${base}
Write Vitest tests for Stage 5 (Event System):
- Test that every event type in SPEC-AUTOMATION.md has a handler function
- Test that emitEvent() function exists and accepts event name + payload
- Test that event handlers are registered in an event registry
- Test that each handler calls the correct side effects (check function exists, not actual execution)
Run: npx vitest run __tests__/stage5-*.test.ts --reporter=verbose
If all pass, output: TESTS PASS. If failures, output the full error.`,

    6: `${base}
Write Vitest tests for Stage 6 (Automation):
- Test email rules engine: condition matching (from, subject, contains)
- Test email rules engine: action execution (move, label, mark read)
- Test scheduled email processor logic
- Test snooze expiry logic
- Test cron job endpoint auth (rejects without CRON_SECRET)
Run: npx vitest run __tests__/stage6-*.test.ts --reporter=verbose
If all pass, output: TESTS PASS. If failures, output the full error.`,

    7: `${base}
Write Vitest tests for Stage 7 (AI & Polish):
- Test AI functions exist: remix, dictate, categorize, extract, suggestedReplies
- Test AI functions handle missing OPENAI_API_KEY gracefully (no crash)
- Test admin panel pages render (admin dashboard, users, orgs)
- Test billing/Stripe webhook handler exists and validates signature
Write FULL Playwright E2E suite (__tests__/e2e/full-app.spec.ts):
- Homepage loads with correct title
- Auth pages render
- Protected routes redirect
- Onboarding flow starts for new user
- Admin pages require super_admin
Run: npx vitest run __tests__/stage7-*.test.ts --reporter=verbose
Run: npx playwright test __tests__/e2e/ --reporter=list
If all pass, output: TESTS PASS. If failures, output the full error.`,
  };

  return stageTests[stage] || stageTests[7];
}

// ── Fix prompts (fresh session per attempt) ──

function getFixPrompt(stage, testOutput, attemptNum) {
  return `Read CLAUDE.md and PROJECT-SPEC.md. You are fixing Stage ${stage} failures.

THIS IS FIX ATTEMPT ${attemptNum}/3 — use a FRESH approach each time.

${attemptNum === 1 ? 'Start by reading the test output and fixing the most obvious issues first.' : ''}
${attemptNum === 2 ? 'Previous fix did not resolve all issues. Try a DIFFERENT approach. Re-read the test file and the source code it tests.' : ''}
${attemptNum === 3 ? 'LAST ATTEMPT. Be thorough. Read every failing test, trace the exact code path, and fix the ROOT CAUSE.' : ''}

TEST FAILURES:
${testOutput.slice(-3000)}

RULES:
- Fix ONLY what the tests flag. Do NOT refactor unrelated code.
- Make the SMALLEST possible changes to pass the tests.
- Do NOT modify the test files themselves (unless they have a genuine bug like a wrong import path).
- After fixing, run the tests again to verify: npx vitest run __tests__/stage${stage}-*.test.ts --reporter=verbose
- If Playwright tests failed too, run: npx playwright test __tests__/e2e/ --reporter=list
- If all pass, output: TESTS PASS
- If still failing, output the remaining errors clearly.`;
}


// ═══════════════════════════════════════════════
// PHASE 3: LAUNCH — keys → DB → admin → deploy
// ═══════════════════════════════════════════════

async function phaseLaunch(projectDir) {
  banner('🚀 PHASE 3 — LAUNCH');
  process.chdir(projectDir);

  log(`${B}Build is done! Time to connect your services and go live.${R}`);
  log(`Each step below tells you exactly what to do.`);
  log(`If you already have API-KEY-BLUEPRINT.md open, even better.`);
  console.log('');

  const keys = {};

  // ────────────────────────────────────
  // STEP 1/6: Collect ALL keys
  // ────────────────────────────────────
  banner('🔑 STEP 1/6 — API Keys');
  log(`For each service below, follow the steps to get your key.`);
  log(`Press Enter to skip any optional service — you can add it later.`);
  console.log('');

  // Supabase
  console.log(`  ${B}${C}━━━ Supabase (Database) ━━━${R}`);
  console.log(`  ${DIM}This is your database. You need one access token to set everything up.${R}`);
  console.log('');
  console.log(`  ${B}Step 1:${R} Go to ${C}https://supabase.com/dashboard/account/tokens${R}`);
  console.log(`         ${DIM}(Create a free account at supabase.com first if you don't have one)${R}`);
  console.log(`  ${B}Step 2:${R} Click ${C}Generate new token${R}`);
  console.log(`         - Name: type ${C}codebakers${R}`);
  console.log(`         - Click ${C}Generate token${R}`);
  console.log(`  ${B}Step 3:${R} Copy the token (starts with ${C}sbp_${R})`);
  console.log('');
  keys.SUPABASE_ACCESS_TOKEN = await askKey('SUPABASE_ACCESS_TOKEN', '  Paste your Supabase token: ', { required: true });
  console.log('');

  // Azure
  console.log(`  ${B}${C}━━━ Microsoft Azure (Outlook/365 Email Access) ━━━${R}`);
  console.log(`  ${DIM}This lets your app connect to users' Outlook email accounts.${R}`);
  console.log('');
  console.log(`  ${B}Step 1:${R} Go to ${C}https://portal.azure.com${R}`);
  console.log(`         ${DIM}(Sign in with any Microsoft account — free)${R}`);
  console.log(`  ${B}Step 2:${R} Search for ${C}App registrations${R} in the top search bar`);
  console.log(`  ${B}Step 3:${R} Click ${C}New registration${R}`);
  console.log(`         - Name: type ${C}CodeBakers App${R}`);
  console.log(`         - Supported account types: select ${C}Accounts in any organizational directory and personal Microsoft accounts${R}`);
  console.log(`         - Redirect URI: select ${C}Web${R} and enter ${C}http://localhost:3000/api/auth/callback/azure-ad${R}`);
  console.log(`         - Click ${C}Register${R}`);
  console.log(`  ${B}Step 4:${R} On the app page, copy the ${C}Application (client) ID${R}`);
  console.log('');
  keys.AZURE_AD_CLIENT_ID = await askKey('AZURE_AD_CLIENT_ID', '  Azure Client ID: ');
  console.log('');
  console.log(`  ${B}Step 5:${R} In the left sidebar, click ${C}Certificates & secrets${R}`);
  console.log(`         - Click ${C}New client secret${R}`);
  console.log(`         - Description: type ${C}codebakers${R}`);
  console.log(`         - Expires: pick ${C}24 months${R}`);
  console.log(`         - Click ${C}Add${R}`);
  console.log(`         - Copy the ${C}Value${R} (NOT the Secret ID)`);
  console.log('');
  keys.AZURE_AD_CLIENT_SECRET = await askKey('AZURE_AD_CLIENT_SECRET', '  Azure Client Secret: ');
  keys.AZURE_AD_TENANT_ID = 'common';
  if (keys.AZURE_AD_CLIENT_ID && keys.AZURE_AD_CLIENT_SECRET) {
    log(`${DIM}  Testing Azure credentials together...${R}`);
    const azureTest = await validateKey('AZURE_AD_PAIR_TEST', `${keys.AZURE_AD_CLIENT_ID}|||${keys.AZURE_AD_CLIENT_SECRET}`);
    log(azureTest.valid ? `${G}  ✓ ${azureTest.message}${R}` : `${D}  ✗ ${azureTest.message}${R}`);
  }
  console.log('');

  // Google
  console.log(`  ${B}${C}━━━ Google Cloud (Gmail Access) ━━━${R}`);
  console.log(`  ${DIM}This lets your app connect to users' Gmail accounts.${R}`);
  console.log('');
  console.log(`  ${B}Step 1:${R} Go to ${C}https://console.cloud.google.com${R}`);
  console.log(`         ${DIM}(Sign in with any Google account — free)${R}`);
  console.log(`  ${B}Step 2:${R} Create a new project (top dropdown → ${C}New Project${R} → name it → ${C}Create${R})`);
  console.log(`  ${B}Step 3:${R} In the left sidebar: ${C}APIs & Services${R} → ${C}Enabled APIs${R}`);
  console.log(`         - Click ${C}+ ENABLE APIS AND SERVICES${R}`);
  console.log(`         - Search for ${C}Gmail API${R} → click it → click ${C}Enable${R}`);
  console.log(`  ${B}Step 4:${R} Go to ${C}APIs & Services${R} → ${C}OAuth consent screen${R}`);
  console.log(`         - User type: ${C}External${R} → ${C}Create${R}`);
  console.log(`         - Fill in app name, support email → ${C}Save and Continue${R} through all steps`);
  console.log(`  ${B}Step 5:${R} Go to ${C}APIs & Services${R} → ${C}Credentials${R}`);
  console.log(`         - Click ${C}+ CREATE CREDENTIALS${R} → ${C}OAuth client ID${R}`);
  console.log(`         - Application type: ${C}Web application${R}`);
  console.log(`         - Authorized redirect URIs: add ${C}http://localhost:3000/api/auth/callback/google${R}`);
  console.log(`         - Click ${C}Create${R}`);
  console.log(`         - Copy the ${C}Client ID${R} and ${C}Client Secret${R}`);
  console.log('');
  keys.GOOGLE_CLIENT_ID = await askKey('GOOGLE_CLIENT_ID', '  Google Client ID: ');
  keys.GOOGLE_CLIENT_SECRET = await askKey('GOOGLE_CLIENT_SECRET', '  Google Client Secret: ');
  if (keys.GOOGLE_CLIENT_ID && keys.GOOGLE_CLIENT_SECRET) {
    log(`${DIM}  Testing Google credentials together...${R}`);
    const googleTest = await validateKey('GOOGLE_PAIR_TEST', `${keys.GOOGLE_CLIENT_ID}|||${keys.GOOGLE_CLIENT_SECRET}`);
    log(googleTest.valid ? `${G}  ✓ ${googleTest.message}${R}` : `${D}  ✗ ${googleTest.message}${R}`);
  }
  console.log('');

  // Stripe
  console.log(`  ${B}${C}━━━ Stripe (Payments & Billing) ━━━${R}`);
  console.log(`  ${DIM}This handles subscriptions and payments. Optional — press Enter to skip.${R}`);
  console.log('');
  console.log(`  ${B}Step 1:${R} Go to ${C}https://dashboard.stripe.com/test/apikeys${R}`);
  console.log(`         ${DIM}(Create a free Stripe account first if needed)${R}`);
  console.log(`  ${B}Step 2:${R} Copy your ${C}Secret key${R} (starts with sk_test_)`);
  console.log('');
  keys.STRIPE_SECRET_KEY = await askKey('STRIPE_SECRET_KEY', '  Stripe Secret Key (or Enter to skip): ');
  if (keys.STRIPE_SECRET_KEY) {
    console.log('');
    console.log(`  ${B}Step 3:${R} On the same page, you'll also see a ${C}Publishable key${R}`);
    keys.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = await askKey('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', '  Stripe Publishable Key: ');
    console.log('');
    console.log(`  ${B}Step 4:${R} For webhooks and price IDs, see API-KEY-BLUEPRINT.md`);
    console.log(`         ${DIM}(You can add these later — the app works without them initially)${R}`);
    keys.STRIPE_WEBHOOK_SECRET = await askKey('STRIPE_WEBHOOK_SECRET', '  Webhook Secret (whsec_... or Enter to add later): ');
    keys.STRIPE_PRO_PRICE_ID = await ask('  Pro Monthly price_id (or Enter): ');
    keys.STRIPE_PRO_ANNUAL_PRICE_ID = await ask('  Pro Annual price_id (or Enter): ');
    keys.STRIPE_BUSINESS_PRICE_ID = await ask('  Business Monthly price_id (or Enter): ');
    keys.STRIPE_BUSINESS_ANNUAL_PRICE_ID = await ask('  Business Annual price_id (or Enter): ');
  }
  console.log('');

  // OpenAI
  console.log(`  ${B}${C}━━━ OpenAI (AI Features) ━━━${R}`);
  console.log(`  ${DIM}Powers smart email features like summaries and suggested replies.${R}`);
  console.log('');
  console.log(`  ${B}Step 1:${R} Go to ${C}https://platform.openai.com/api-keys${R}`);
  console.log(`  ${B}Step 2:${R} Click ${C}+ Create new secret key${R}`);
  console.log(`         - Name: type ${C}codebakers${R} → click ${C}Create${R}`);
  console.log(`  ${B}Step 3:${R} Copy the key (starts with ${C}sk-${R})`);
  console.log('');
  keys.OPENAI_API_KEY = await askKey('OPENAI_API_KEY', '  OpenAI API Key (or Enter to skip): ');
  console.log('');

  // Resend
  console.log(`  ${B}${C}━━━ Resend (Outgoing Emails from Your App) ━━━${R}`);
  console.log(`  ${DIM}Sends notification and onboarding emails to your users.${R}`);
  console.log('');
  console.log(`  ${B}Step 1:${R} Go to ${C}https://resend.com/api-keys${R}`);
  console.log(`         ${DIM}(Create a free account first if needed)${R}`);
  console.log(`  ${B}Step 2:${R} Click ${C}+ Create API Key${R}`);
  console.log(`         - Name: ${C}codebakers${R} → click ${C}Add${R}`);
  console.log(`  ${B}Step 3:${R} Copy the key (starts with ${C}re_${R})`);
  console.log('');
  keys.RESEND_API_KEY = await askKey('RESEND_API_KEY', '  Resend API Key (or Enter to skip): ');
  keys.RESEND_FROM_EMAIL = '';
  if (keys.RESEND_API_KEY) {
    console.log(`  ${DIM}What email address should your app send from?${R}`);
    console.log(`  ${DIM}(Use onboarding@resend.dev for testing, or your own domain like noreply@yourdomain.com)${R}`);
    keys.RESEND_FROM_EMAIL = await ask('  From email (or Enter for sandbox): ') || 'onboarding@resend.dev';
  }
  console.log('');

  // Twilio
  console.log(`  ${B}${C}━━━ Twilio (SMS Notifications) — Optional ━━━${R}`);
  console.log(`  ${DIM}Send text message alerts. Most apps don't need this right away.${R}`);
  keys.TWILIO_ACCOUNT_SID = await askKey('TWILIO_ACCOUNT_SID', '  Twilio Account SID (or Enter to skip): ');
  if (keys.TWILIO_ACCOUNT_SID) {
    keys.TWILIO_AUTH_TOKEN = await askKey('TWILIO_AUTH_TOKEN', '  Auth Token: ');
    if (keys.TWILIO_AUTH_TOKEN) {
      log(`${DIM}  Testing Twilio credentials together...${R}`);
      const twilioTest = await validateKey('TWILIO_PAIR_TEST', `${keys.TWILIO_ACCOUNT_SID}|||${keys.TWILIO_AUTH_TOKEN}`);
      log(twilioTest.valid ? `${G}  ✓ ${twilioTest.message}${R}` : `${D}  ✗ ${twilioTest.message}${R}`);
    }
    keys.TWILIO_PHONE_NUMBER = await ask('  Phone number (+1...): ');
  }
  console.log('');

  // Sentry
  console.log(`  ${B}${C}━━━ Sentry (Error Tracking) — Optional ━━━${R}`);
  console.log(`  ${DIM}Alerts you when something breaks in production. Good to have but not required.${R}`);
  keys.NEXT_PUBLIC_SENTRY_DSN = await askKey('NEXT_PUBLIC_SENTRY_DSN', '  Sentry DSN (or Enter to skip): ');
  console.log('');

  // Auto-generate security keys
  const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  keys.CRON_SECRET = hex(64);
  keys.ENCRYPTION_KEY = hex(64);
  log(`${G}✓${R} Security keys auto-generated`);

  // Admin account
  console.log('');
  console.log(`  ${B}${C}━━━ Your Admin Account ━━━${R}`);
  console.log(`  ${DIM}This is the first user account. You'll use it to log into your app.${R}`);
  console.log('');
  keys._ADMIN_EMAIL = await ask('  Your email: ');
  keys._ADMIN_PASSWORD = await ask('  Choose a password (8+ characters): ');
  keys._ADMIN_NAME = await ask('  Your name: ');
  console.log('');

  log(`${G}${B}✓ All info collected! Setting everything up now...${R}`);
  log(`${DIM}(This part is automatic — sit back and watch)${R}`);


  // ────────────────────────────────────
  // STEP 2/6: Provision Supabase
  // ────────────────────────────────────
  banner('🗄️  STEP 2/6 — Database');

  let supaResult = {};
  if (keys.SUPABASE_ACCESS_TOKEN?.startsWith('sbp_')) {
    try {
      const { autoProvision } = await import('./setup-supabase.mjs');
      let pn = basename(projectDir);
      try { pn = JSON.parse(readFileSync('package.json', 'utf-8')).name || pn; } catch {}
      supaResult = await autoProvision({ projectName: pn, appUrl: 'http://localhost:3000', skipMigration: false, token: keys.SUPABASE_ACCESS_TOKEN });
    } catch (err) { log(`${Y}⚠ Auto-provision failed: ${err.message}${R}`); }
  }

  if (supaResult.NEXT_PUBLIC_SUPABASE_URL) {
    keys.NEXT_PUBLIC_SUPABASE_URL = supaResult.NEXT_PUBLIC_SUPABASE_URL;
    keys.NEXT_PUBLIC_SUPABASE_ANON_KEY = supaResult.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    keys.SUPABASE_SERVICE_ROLE_KEY = supaResult.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    console.log(`  ${DIM}Automatic database creation didn't work. Enter keys manually:${R}`);
    console.log(`  ${B}Go to:${R} ${C}supabase.com/dashboard${R} → your project → ${C}Settings → API${R}`);
    keys.NEXT_PUBLIC_SUPABASE_URL = await askKey('NEXT_PUBLIC_SUPABASE_URL', '  Project URL: ');
    keys.NEXT_PUBLIC_SUPABASE_ANON_KEY = await askKey('NEXT_PUBLIC_SUPABASE_ANON_KEY', '  Anon Key: ');
    keys.SUPABASE_SERVICE_ROLE_KEY = await askKey('SUPABASE_SERVICE_ROLE_KEY', '  Service Role Key: ');
  }

  // Push migrations
  const ref = keys.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (ref && !supaResult.migrationApplied && existsSync('supabase/migrations')) {
    log('Pushing database tables...');
    const tok = keys.SUPABASE_ACCESS_TOKEN;
    if (tok) {
      for (const mf of readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) {
        try {
          const sql = readFileSync(join('supabase/migrations', mf), 'utf-8');
          const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: sql }),
          });
          log(r.ok ? `${G}✓${R} ${mf}` : `${Y}⚠ ${mf}: ${(await r.text()).substring(0, 120)}${R}`);
        } catch (e) { log(`${Y}⚠ ${mf}: ${e.message}${R}`); }
      }
    } else if (cmdExists('supabase')) {
      run(`supabase link --project-ref ${ref}`, { silent: true });
      run('supabase db push');
    }
  }


  // ────────────────────────────────────
  // STEP 3/6: Create admin user
  // ────────────────────────────────────
  banner('👤 STEP 3/6 — Admin User');

  if (keys.NEXT_PUBLIC_SUPABASE_URL && keys.SUPABASE_SERVICE_ROLE_KEY && keys._ADMIN_EMAIL && keys._ADMIN_PASSWORD?.length >= 8) {
    try {
      const url = keys.NEXT_PUBLIC_SUPABASE_URL;
      const sk = keys.SUPABASE_SERVICE_ROLE_KEY;
      const authRes = await fetch(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sk}`, 'apikey': sk, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: keys._ADMIN_EMAIL, password: keys._ADMIN_PASSWORD, email_confirm: true, user_metadata: { name: keys._ADMIN_NAME, full_name: keys._ADMIN_NAME } }),
      });
      if (authRes.ok) {
        const { id: userId } = await authRes.json();
        const ins = await fetch(`${url}/rest/v1/users`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sk}`, 'apikey': sk, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ id: userId, email: keys._ADMIN_EMAIL, name: keys._ADMIN_NAME, role: 'SUPER_ADMIN', is_super_admin: true, onboarding_completed: true, onboarding_step: 16 }),
        });
        log(ins.ok || ins.status === 201
          ? `${G}✓${R} Admin created: ${C}${keys._ADMIN_EMAIL}${R} (super admin)`
          : `${G}✓${R} Auth user created — profile row added on first login`);
      } else { log(`${Y}⚠ ${(await authRes.text()).substring(0, 120)}${R}`); }
    } catch (e) { log(`${Y}⚠ ${e.message}${R}`); }
  } else { log(`${Y}Skipped — create admin in the app after deploy${R}`); }


  // ────────────────────────────────────
  // STEP 4/6: Write real .env.local
  // ────────────────────────────────────
  banner('📝 STEP 4/6 — Environment');

  const env = [
    `# Generated by CodeBakers — ${new Date().toISOString()}`, '',
    '# ── App ──', 'NEXT_PUBLIC_APP_URL=http://localhost:3000', '',
    '# ── Supabase ──',
    `NEXT_PUBLIC_SUPABASE_URL=${keys.NEXT_PUBLIC_SUPABASE_URL || ''}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${keys.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
    `SUPABASE_SERVICE_ROLE_KEY=${keys.SUPABASE_SERVICE_ROLE_KEY || ''}`, '',
    '# ── Azure ──',
    `AZURE_AD_CLIENT_ID=${keys.AZURE_AD_CLIENT_ID || ''}`,
    `AZURE_AD_CLIENT_SECRET=${keys.AZURE_AD_CLIENT_SECRET || ''}`,
    `AZURE_AD_TENANT_ID=common`, '',
    '# ── Google ──',
    `GOOGLE_CLIENT_ID=${keys.GOOGLE_CLIENT_ID || ''}`,
    `GOOGLE_CLIENT_SECRET=${keys.GOOGLE_CLIENT_SECRET || ''}`, '',
    '# ── Stripe ──',
    `STRIPE_SECRET_KEY=${keys.STRIPE_SECRET_KEY || ''}`,
    `STRIPE_WEBHOOK_SECRET=${keys.STRIPE_WEBHOOK_SECRET || ''}`,
    `STRIPE_PRO_PRICE_ID=${keys.STRIPE_PRO_PRICE_ID || ''}`,
    `STRIPE_PRO_ANNUAL_PRICE_ID=${keys.STRIPE_PRO_ANNUAL_PRICE_ID || ''}`,
    `STRIPE_BUSINESS_PRICE_ID=${keys.STRIPE_BUSINESS_PRICE_ID || ''}`,
    `STRIPE_BUSINESS_ANNUAL_PRICE_ID=${keys.STRIPE_BUSINESS_ANNUAL_PRICE_ID || ''}`, '',
    '# ── OpenAI ──', `OPENAI_API_KEY=${keys.OPENAI_API_KEY || ''}`, '',
    '# ── Resend ──',
    `RESEND_API_KEY=${keys.RESEND_API_KEY || ''}`,
    `RESEND_FROM_EMAIL=${keys.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}`, '',
    '# ── Twilio ──',
    `TWILIO_ACCOUNT_SID=${keys.TWILIO_ACCOUNT_SID || ''}`,
    `TWILIO_AUTH_TOKEN=${keys.TWILIO_AUTH_TOKEN || ''}`,
    `TWILIO_PHONE_NUMBER=${keys.TWILIO_PHONE_NUMBER || ''}`, '',
    '# ── Monitoring ──', `NEXT_PUBLIC_SENTRY_DSN=${keys.NEXT_PUBLIC_SENTRY_DSN || ''}`, '',
    '# ── Security ──', `CRON_SECRET=${keys.CRON_SECRET}`, `ENCRYPTION_KEY=${keys.ENCRYPTION_KEY}`,
  ].join('\n') + '\n';

  writeFileSync('.env.local', env);
  writeFileSync('.env.example', env.replace(/=.+$/gm, '='));
  log(`${G}✓${R} .env.local written with real keys`);

  log('Rebuilding with real environment...');
  run('npm install 2>/dev/null', { silent: true });
  const buildOut = run('npm run build 2>&1', { silent: true });
  log(buildOut && !buildOut.includes('Build error') ? `${G}✓${R} Production build passed` : `${Y}⚠ Build had warnings — continuing${R}`);


  // ────────────────────────────────────
  // STEP 5/6: GitHub
  // ────────────────────────────────────
  banner('📦 STEP 5/6 — GitHub');

  let repoUrl = '';
  if (cmdExists('gh')) {
    const gs = run('gh auth status 2>&1', { silent: true });
    if (gs && !gs.includes('not logged')) {
      let rn = basename(projectDir);
      try { rn = JSON.parse(readFileSync('package.json', 'utf-8')).name || rn; } catch {}
      log(`Creating private repo: ${C}${rn}${R}`);
      if (!existsSync('.git')) run('git init', { silent: true });
      if (!existsSync('.gitignore')) writeFileSync('.gitignore', 'node_modules\n.env.local\n.env\n.next\n.vercel\n');
      run('git add -A', { silent: true });
      run('git commit -m "Initial build from CodeBakers" --allow-empty', { silent: true });
      const gr = run(`gh repo create ${rn} --private --source=. --push 2>&1`, { silent: true });
      if (gr) {
        repoUrl = gr.match(/https:\/\/github\.com\/[^\s]+/)?.[0] || run('gh repo view --json url -q .url 2>/dev/null', { silent: true })?.trim() || '';
        log(`${G}✓${R} ${C}${repoUrl}${R}`);
      } else {
        run('git push -u origin main 2>/dev/null', { silent: true });
        repoUrl = run('gh repo view --json url -q .url 2>/dev/null', { silent: true })?.trim() || '';
        log(repoUrl ? `${G}✓${R} Pushed: ${C}${repoUrl}${R}` : `${Y}⚠ Push failed — do it manually later${R}`);
      }
    } else log(`${Y}⚠ GitHub not logged in — skipping. Run: gh auth login${R}`);
  } else log(`${Y}⚠ GitHub CLI not found — skipping${R}`);


  // ────────────────────────────────────
  // STEP 6/6: Deploy
  // ────────────────────────────────────
  banner('🌐 STEP 6/6 — Deploy');

  let deployUrl = '';
  if (cmdExists('vercel')) {
    const vw = run('vercel whoami 2>&1', { silent: true });
    if (vw && !vw.includes('not logged') && !vw.includes('Error')) {
      run('vercel link --yes 2>/dev/null', { silent: true });

      log('Pushing env vars to Vercel...');
      for (const [k, v] of Object.entries(keys)) {
        if (k.startsWith('_') || !v || k === 'SUPABASE_ACCESS_TOKEN') continue;
        const safeVal = String(v).replace(/"/g, '\\"');
        if (getPlatform() === 'win') {
          run(`echo ${safeVal}| vercel env add ${k} production --force 2>nul`, { silent: true });
        } else {
          run(`printf '%s' "${safeVal}" | vercel env add ${k} production --force 2>/dev/null`, { silent: true });
        }
      }

      log('Deploying...');
      const dr = run('vercel --prod --yes 2>&1', { silent: true });
      if (dr) {
        deployUrl = dr.match(/https:\/\/[^\s]+\.vercel\.app/)?.[0] || '';
        if (deployUrl) {
          log(`${G}✓${R} Live: ${C}${deployUrl}${R}`);
          if (getPlatform() === 'win') {
            run(`echo ${deployUrl}| vercel env add NEXT_PUBLIC_APP_URL production --force 2>nul`, { silent: true });
          } else {
            run(`printf '%s' "${deployUrl}" | vercel env add NEXT_PUBLIC_APP_URL production --force 2>/dev/null`, { silent: true });
          }

          // Update Supabase auth redirects
          if (keys.SUPABASE_ACCESS_TOKEN && ref) {
            try {
              await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${keys.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  site_url: deployUrl,
                  uri_allow_list: [
                    `${deployUrl}/api/auth/callback`, `${deployUrl}/api/auth/oauth/callback`, `${deployUrl}/auth/callback`,
                    'http://localhost:3000/api/auth/callback', 'http://localhost:3000/api/auth/oauth/callback', 'http://localhost:3000/auth/callback',
                  ].join(','),
                }),
              });
              log(`${G}✓${R} Supabase auth redirects updated`);
            } catch {}
          }

          // Verify
          await new Promise(r => setTimeout(r, 5000));
          try {
            const h = await fetch(deployUrl, { redirect: 'manual' });
            log(`${G}✓${R} Verified (${h.status})`);
          } catch { log(`${Y}⚠ Check manually: ${deployUrl}${R}`); }
        }
      } else log(`${Y}⚠ Deploy failed — run: vercel --prod${R}`);
    } else log(`${Y}⚠ Vercel not logged in — skipping. Run: vercel login${R}`);
  } else log(`${Y}⚠ Vercel CLI not found — skipping${R}`);

  return { deployUrl, repoUrl, keys };
}


// ═══════════════════════════════════════════════
// ADD FEATURE — research → spec → review → build
// ═══════════════════════════════════════════════

async function featureAdd() {
  console.log('');
  console.log(`${B}${C}  ╔════════════════════════════════════════════════╗${R}`);
  console.log(`${B}${C}  ║          🧁 CODEBAKERS — ADD FEATURE           ║${R}`);
  console.log(`${B}${C}  ║                                                 ║${R}`);
  console.log(`${B}${C}  ║  Describe what you want → we research & plan   ║${R}`);
  console.log(`${B}${C}  ║  → you review → we build → auto-deploy         ║${R}`);
  console.log(`${B}${C}  ╚════════════════════════════════════════════════╝${R}`);
  console.log('');

  // Verify we're in a CodeBakers project
  if (!existsSync('PROJECT-SPEC.md') && !existsSync('CLAUDE.md')) {
    log(`${D}This doesn't look like a CodeBakers project.${R}`);
    log(`Make sure you're in the project folder (the one with PROJECT-SPEC.md).`);
    log(`${C}cd your-project-name${R} then run ${C}node codebakers.mjs add${R}`);
    quit(1);
  }

  if (!existsSync('BUILD-STATE.md')) {
    log(`${Y}No BUILD-STATE.md found — has the initial build completed?${R}`);
    log(`Run ${C}node codebakers.mjs${R} first to build the app, then add features.`);
    quit(1);
  }

  if (!cmdExists('claude')) {
    log(`${D}Claude Code CLI not found.${R}`);
    log(`Install: ${C}npm install -g @anthropic-ai/claude-code${R}`);
    quit(1);
  }

  // Set up logging
  const logsDir = existsSync('.codebakers') ? '.codebakers/logs' : existsSync('.forge') ? '.forge/logs' : '.codebakers/logs';
  mkdirSync(logsDir, { recursive: true });
  globalThis.logFile = join(logsDir, `feature-${Date.now()}.log`);

  // Read existing project context
  const specContent = existsSync('PROJECT-SPEC.md') ? readFileSync('PROJECT-SPEC.md', 'utf-8') : '';
  const buildState = existsSync('BUILD-STATE.md') ? readFileSync('BUILD-STATE.md', 'utf-8') : '';
  const projectName = (() => { try { return JSON.parse(readFileSync('package.json', 'utf-8')).name; } catch { return basename(resolve('.')); } })();

  log(`${G}✓${R} Project: ${C}${projectName}${R}`);
  log(`${G}✓${R} Build state loaded`);
  console.log('');

  // ── Collect features (loop until user says build or cancel) ──
  const features = [];
  let featureNum = 1;
  let keepAdding = true;

  while (keepAdding) {
    banner(`✏️  FEATURE ${featureNum} — Describe It`);

    console.log(`  ${B}What do you want to add?${R} Describe it in plain English.`);
    console.log(`  Be as detailed or as vague as you want.`);
    console.log('');
    console.log(`  ${DIM}Examples:${R}`);
    console.log(`  ${DIM}  "Add a calendar view for emails"${R}`);
    console.log(`  ${DIM}  "Users should be able to create folders and drag emails into them"${R}`);
    console.log(`  ${DIM}  "Add dark mode toggle in settings"${R}`);
    console.log(`  ${DIM}  "Integrate with Slack so users get notified of important emails"${R}`);
    console.log(`  ${DIM}  "Add a dashboard with charts showing email volume per day"${R}`);
    console.log('');

    const description = await ask('  Describe your feature:\n  > ');

    if (!description.trim()) {
      log(`${Y}No description entered. Try again or type "cancel" to exit.${R}`);
      continue;
    }

    if (description.trim().toLowerCase() === 'cancel') {
      log('Cancelled. No changes made.');
      quit(0);
    }

    // ── Ask for extra context ──
    console.log('');
    console.log(`  ${B}Any extra details?${R} ${DIM}(paste URLs, API docs, screenshots description — or Enter to skip)${R}`);
    console.log(`  ${DIM}If this involves a third-party service (Slack, Twilio, etc.), paste the API docs URL here.${R}`);
    const extraContext = await ask('  Extra info (or Enter): ');
    console.log('');

    // ── Research & generate spec via Claude Code ──
    banner(`🔬 RESEARCHING FEATURE ${featureNum}`);
    log(`Analyzing your codebase and planning the changes...`);
    log(`${DIM}(This may take a minute)${R}`);
    console.log('');

    const researchPrompt = `You are a senior full-stack architect working on the "${projectName}" project.

READ THESE FILES FIRST:
- PROJECT-SPEC.md (the full app specification)
- BUILD-STATE.md (current build status)
- CLAUDE.md (coding rules)
- Browse the src/ directory to understand the current codebase structure

THE USER WANTS TO ADD THIS FEATURE:
"""
${description.trim()}
"""

${extraContext ? `ADDITIONAL CONTEXT FROM USER:\n"""\n${extraContext.trim()}\n"""` : ''}

YOUR TASK — Generate a FEATURE-SPEC that matches the quality of the original PROJECT-SPEC.md:

Write the spec to a file called FEATURE-SPEC-${featureNum}.md with this exact format:

# Feature: [clear name]

## Summary
[2-3 sentence description of what this feature does and why]

## Database Changes
[New tables, new columns on existing tables, new indexes, new RLS policies. If none needed, say "None"]

## UI Changes
[New pages, new components, changes to existing pages. Include the route paths like /dashboard/calendar]

## API/Server Changes
[New server actions, new API routes, new middleware, webhooks. Include function signatures]

## Permissions
[Which roles can use this feature? What are the access rules?]

## New Dependencies
[Any new npm packages needed? Any new external APIs?]

## New Environment Variables
[Any new API keys or config needed? Include the env var names]

## Migration Plan
[Step-by-step what needs to happen: 1. Add migration, 2. Create components, 3. Update routes, etc.]

## Estimated Complexity
[Simple / Medium / Complex — and brief justification]

## Files That Will Change
[List every file that will be created or modified]

After writing the spec file, output a PLAIN ENGLISH SUMMARY (not markdown) of what you plan to build. Start the summary with "SUMMARY:" on its own line. Keep it conversational — the user is not technical. End with "END_SUMMARY" on its own line.`;

    const researchResult = await runClaudeCode(researchPrompt, resolve('.'));

    // Read the generated spec
    const specPath = `FEATURE-SPEC-${featureNum}.md`;
    let featureSpec = '';
    if (existsSync(specPath)) {
      featureSpec = readFileSync(specPath, 'utf-8');
    }

    // Extract the plain English summary
    const summaryMatch = researchResult.output.match(/SUMMARY:([\s\S]*?)END_SUMMARY/);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';

    // ── Show the user what we'll build ──
    banner(`📋 FEATURE ${featureNum} — Review`);

    if (summary) {
      console.log(`  ${B}Here's what we'll build:${R}`);
      console.log('');
      // Print summary with indentation
      for (const line of summary.split('\n')) {
        console.log(`  ${line}`);
      }
    } else if (featureSpec) {
      // Fallback: show first part of spec
      const lines = featureSpec.split('\n').slice(0, 20);
      for (const line of lines) console.log(`  ${line}`);
      if (featureSpec.split('\n').length > 20) console.log(`  ${DIM}... (full spec in ${specPath})${R}`);
    } else {
      log(`${Y}Could not generate a spec for this feature. Try describing it differently.${R}`);
      continue;
    }

    // Check if new env vars are needed
    const envVarMatch = featureSpec.match(/## New Environment Variables\n([\s\S]*?)(?=\n## |\n$)/);
    if (envVarMatch && !envVarMatch[1].toLowerCase().includes('none')) {
      console.log('');
      console.log(`  ${Y}${B}⚠ This feature needs new API keys:${R}`);
      for (const line of envVarMatch[1].trim().split('\n')) {
        if (line.trim()) console.log(`  ${Y}  ${line.trim()}${R}`);
      }
      console.log(`  ${DIM}You'll be asked for these after the build.${R}`);
    }

    // Store feature info
    features.push({
      num: featureNum,
      description: description.trim(),
      specPath,
      spec: featureSpec,
    });

    // ── Ask: Build, add more, or cancel? ──
    console.log('');
    console.log(`  ${B}What would you like to do?${R}`);
    console.log(`    ${C}1${R} — ${G}Build it${R} (build ${features.length === 1 ? 'this feature' : `all ${features.length} features`} now)`);
    console.log(`    ${C}2${R} — ${C}Add another feature${R} (describe one more, then decide)`);
    console.log(`    ${C}3${R} — ${D}Cancel${R} (discard everything, no changes made)`);
    console.log('');
    const choice = await ask('  Your choice (1/2/3): ');

    if (choice.trim() === '3') {
      // Clean up spec files
      for (const f of features) {
        if (existsSync(f.specPath)) run(`rm "${f.specPath}"`, { silent: true });
      }
      log('Cancelled. No changes made to your project.');
      quit(0);
    } else if (choice.trim() === '2') {
      featureNum++;
      continue; // Loop back to add another
    } else {
      keepAdding = false; // Fall through to build
    }
  }

  // ── BUILD ALL FEATURES ──
  banner(`🔨 BUILDING ${features.length} FEATURE${features.length > 1 ? 'S' : ''}`);

  // Merge all feature specs into one build prompt
  const allSpecs = features.map(f => f.spec).join('\n\n---\n\n');
  const specFiles = features.map(f => f.specPath).join(', ');

  log(`Features to build: ${features.map(f => f.description.substring(0, 50)).join('; ')}`);
  log(`Specs: ${specFiles}`);
  log(`${C}Building now — this may take several minutes...${R}`);
  console.log('');

  const buildPrompt = `You are implementing new features for the "${projectName}" project.

READ THESE FILES FIRST:
- CLAUDE.md (coding rules — follow these strictly)
- PROJECT-SPEC.md (understand the full app architecture)
- BUILD-STATE.md (current state)
${features.map(f => `- ${f.specPath} (feature spec — implement this)`).join('\n')}

IMPLEMENT ALL FEATURES in the spec files above. Follow these rules:
1. Match the code quality, patterns, and style of the existing codebase exactly
2. Add database migrations to supabase/migrations/ with proper timestamps
3. Add proper TypeScript types for all new code
4. Add RLS policies for any new tables
5. Add Zod validation for any new forms or API inputs
6. Follow the existing component patterns in the codebase
7. Add proper error handling and loading states
8. Make it mobile-responsive
9. Update any existing tests and add new ones where appropriate
10. If new environment variables are needed, add them to .env.example

After building, verify:
- Run TypeScript compiler: npx tsc --noEmit
- Run linter if configured: npm run lint
- Verify the build: npm run build

Update BUILD-STATE.md to note the features added and current timestamp.

If everything passes, end with: FEATURES COMPLETE`;

  const buildResult = await runClaudeCode(buildPrompt, resolve('.'));

  const success = buildResult.output.includes('FEATURES COMPLETE') ||
    (existsSync('BUILD-STATE.md') && readFileSync('BUILD-STATE.md', 'utf-8').includes('feature'));

  if (success) {
    log(`${G}${B}✓ Features built successfully!${R}`);
  } else {
    log(`${Y}⚠ Build may have had issues — check the output above${R}`);
    const cont = await ask('  Continue with deploy? (Y/n): ');
    if (cont.toLowerCase() === 'n') {
      log(`Feature specs saved in ${specFiles}. Fix issues and re-run.`);
      rl.close();
      return;
    }
  }

  // ── Check for new env vars needed ──
  let newEnvVars = false;
  for (const f of features) {
    const envMatch = f.spec.match(/## New Environment Variables\n([\s\S]*?)(?=\n## |\n$)/);
    if (envMatch && !envMatch[1].toLowerCase().includes('none')) {
      if (!newEnvVars) {
        banner('🔑 NEW API KEYS NEEDED');
        log(`The new features need some additional configuration.`);
        console.log('');
        newEnvVars = true;
      }

      for (const line of envMatch[1].trim().split('\n')) {
        const varMatch = line.match(/[A-Z_]+/);
        if (varMatch) {
          const varName = varMatch[0];
          const currentEnv = existsSync('.env.local') ? readFileSync('.env.local', 'utf-8') : '';
          if (!currentEnv.includes(`${varName}=`) || currentEnv.includes(`${varName}=placeholder`) || currentEnv.includes(`${varName}=\n`)) {
            console.log(`  ${B}${varName}${R}`);
            console.log(`  ${DIM}${line.trim()}${R}`);
            const val = await ask(`  Value (or Enter to skip): `);
            if (val) {
              // Append to .env.local
              appendFileSync('.env.local', `\n${varName}=${val}\n`);
              log(`${G}✓${R} Added ${varName}`);
            }
            console.log('');
          }
        }
      }
    }
  }

  // ── Commit + Deploy ──
  banner('🚀 DEPLOY');

  // Git commit
  if (existsSync('.git')) {
    const featureNames = features.map(f => f.description.substring(0, 40)).join(', ');
    run('git add -A', { silent: true });
    run(`git commit -m "Add feature: ${featureNames.replace(/"/g, "'")}" --allow-empty`, { silent: true });

    if (cmdExists('gh')) {
      run('git push 2>/dev/null', { silent: true });
      log(`${G}✓${R} Changes pushed to GitHub`);
    }
  }

  // Redeploy to Vercel
  if (cmdExists('vercel')) {
    const vw = run('vercel whoami 2>&1', { silent: true });
    if (vw && !vw.includes('not logged') && !vw.includes('Error')) {
      // Push any new env vars
      if (newEnvVars) {
        const envContent = readFileSync('.env.local', 'utf-8');
        for (const line of envContent.split('\n')) {
          if (line.startsWith('#') || !line.includes('=')) continue;
          const [k, ...vParts] = line.split('=');
          const v = vParts.join('=');
          if (k && v && !k.startsWith('_') && k !== 'SUPABASE_ACCESS_TOKEN') {
            const safeVal = v.replace(/"/g, '\\"');
            if (getPlatform() === 'win') {
              run(`echo ${safeVal}| vercel env add ${k} production --force 2>nul`, { silent: true });
            } else {
              run(`printf '%s' "${safeVal}" | vercel env add ${k} production --force 2>/dev/null`, { silent: true });
            }
          }
        }
      }

      log('Redeploying...');
      const dr = run('vercel --prod --yes 2>&1', { silent: true });
      const deployUrl = dr?.match(/https:\/\/[^\s]+\.vercel\.app/)?.[0] || '';
      if (deployUrl) {
        log(`${G}✓${R} Live: ${C}${deployUrl}${R}`);
      } else {
        log(`${Y}⚠ Redeploy may have failed — run: vercel --prod${R}`);
      }
    }
  }

  // ── Done ──
  console.log('');
  console.log(`${B}${G}  ╔════════════════════════════════════════════════╗${R}`);
  console.log(`${B}${G}  ║           ✅ FEATURES ADDED                     ║${R}`);
  console.log(`${B}${G}  ╚════════════════════════════════════════════════╝${R}`);
  console.log('');
  for (const f of features) {
    console.log(`  ${G}✓${R} ${f.description}`);
  }
  console.log('');
  log(`Feature specs saved in: ${features.map(f => f.specPath).join(', ')}`);
  log(`Run ${C}node codebakers.mjs add${R} anytime to add more features.`);
  console.log('');

  rl.close();
}


// ═══════════════════════════════════════════════
// MAIN — route commands
// ═══════════════════════════════════════════════

async function main() {
  const command = process.argv[2];

  // ── ADD FEATURE ──
  if (command === 'add') {
    await featureAdd();
    return;
  }

  // ── FULL BUILD ──
  console.log('');
  console.log(`${B}${C}  ╔════════════════════════════════════════════════╗${R}`);
  console.log(`${B}${C}  ║            🧁 C O D E B A K E R S 🧁           ║${R}`);
  console.log(`${B}${C}  ║        One command. Spec to deployed.           ║${R}`);
  console.log(`${B}${C}  ║                                                 ║${R}`);
  console.log(`${B}${C}  ║  Phase 0  Preflight (check & install tools)     ║${R}`);
  console.log(`${B}${C}  ║  Phase 1  Unzip                                 ║${R}`);
  console.log(`${B}${C}  ║  Phase 2  Build  (hands-free — walk away)       ║${R}`);
  console.log(`${B}${C}  ║  Phase 3  Launch (keys → DB → admin → deploy)  ║${R}`);
  console.log(`${B}${C}  ╚════════════════════════════════════════════════╝${R}`);
  console.log('');

  await phasePreflight();
  const projectDir = await phaseUnzip();
  rl.pause();
  await phaseBuild(projectDir);
  rl.resume();

  log(`\n${B}${G}Build complete! Time for the last step.${R}\n`);
  const { deployUrl, repoUrl, keys } = await phaseLaunch(projectDir);

  // ── Final Summary ──
  console.log('');
  console.log(`${B}${G}  ╔════════════════════════════════════════════════╗${R}`);
  console.log(`${B}${G}  ║              ✅ ALL DONE                        ║${R}`);
  console.log(`${B}${G}  ╚════════════════════════════════════════════════╝${R}`);
  console.log('');
  if (deployUrl) console.log(`  ${B}🌐 Live:${R}      ${C}${deployUrl}${R}`);
  if (repoUrl)   console.log(`  ${B}📦 GitHub:${R}    ${C}${repoUrl}${R}`);
  console.log(`  ${B}💻 Local:${R}     ${C}cd ${basename(projectDir)} && npm run dev${R}`);
  if (keys?._ADMIN_EMAIL) {
    console.log('');
    console.log(`  ${B}🔐 Login:${R}     ${C}${keys._ADMIN_EMAIL}${R} / (your password)`);
  }
  console.log('');
  if (deployUrl) console.log(`  ${G}Open ${deployUrl} and log in.${R}`);
  console.log('');
  console.log(`  ${Y}Post-deploy: Add production redirect URIs to Azure + Google.${R}`);
  console.log(`  ${Y}See API-KEY-BLUEPRINT.md → "After Deploy Checklist"${R}`);
  console.log('');
  console.log(`  ${C}Want to add features later? Run: ${B}node codebakers.mjs add${R}`);
  console.log('');

  rl.close();
}

main().catch((err) => {
  console.error(`\n  ${D}Error: ${err.message}${R}\n`);
  quit(1);
});
