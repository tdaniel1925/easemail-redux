#!/usr/bin/env node

/**
 * SUPABASE AUTO-PROVISIONER
 * 
 * Uses the Supabase Management API to:
 * 1. Create a new project (or use existing)
 * 2. Wait for it to be healthy
 * 3. Run the full migration SQL
 * 4. Configure Auth (redirect URLs, providers)
 * 5. Return all keys needed for .env.local
 * 
 * Requirements: A Supabase Personal Access Token (PAT)
 * Get one at: https://supabase.com/dashboard/account/tokens
 * 
 * Usage:
 *   node setup-supabase.mjs                    # Interactive — asks for token
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node setup-supabase.mjs   # Non-interactive
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

const API = 'https://api.supabase.com/v1';

const G = '\x1b[32m';
const Y = '\x1b[33m';
const C = '\x1b[36m';
const D = '\x1b[31m';
const R = '\x1b[0m';
const B = '\x1b[1m';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

function log(msg) { console.log(`  ${msg}`); }

// ─── API Helper ───
async function api(method, path, token, body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${err}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Step 1: Get Token ───
async function getToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN;
  }

  log('');
  log(`${B}Supabase Access Token${R}`);
  log(`${C}→ Get one at: https://supabase.com/dashboard/account/tokens${R}`);
  log(`  Click "Generate new token", name it "codebakers", copy it.`);
  log('');
  const token = await ask('  Access Token (sbp_...): ');
  if (!token || !token.startsWith('sbp_')) {
    throw new Error('Invalid token. Must start with sbp_');
  }
  return token.trim();
}

// ─── Step 2: Get or Create Organization ───
async function getOrg(token) {
  const orgs = await api('GET', '/organizations', token);
  if (!orgs || orgs.length === 0) {
    throw new Error('No Supabase organizations found. Create one at supabase.com/dashboard first.');
  }

  if (orgs.length === 1) {
    log(`${G}✓${R} Using org: ${B}${orgs[0].name}${R}`);
    return orgs[0].id;
  }

  log('');
  log(`${B}Select organization:${R}`);
  orgs.forEach((o, i) => log(`  ${i + 1}. ${o.name} (${o.id})`));
  const choice = await ask(`  Choice (1-${orgs.length}): `);
  const idx = parseInt(choice) - 1;
  if (idx < 0 || idx >= orgs.length) throw new Error('Invalid selection');
  return orgs[idx].id;
}

// ─── Step 3: Create Project ───
async function createProject(token, orgId, projectName) {
  // Generate strong DB password
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  const dbPass = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  log('');
  log(`Creating project ${B}${projectName}${R}...`);

  const project = await api('POST', '/projects', token, {
    name: projectName,
    organization_id: orgId,
    db_pass: dbPass,
    region: 'us-east-1',
    plan: 'free',
  });

  log(`${G}✓${R} Project created: ${C}${project.id}${R}`);

  return {
    ref: project.id,
    dbPass,
  };
}

// ─── Step 4: Wait for Health ───
async function waitForHealth(token, ref) {
  log('');
  log('Waiting for project to initialize...');

  const maxWait = 120; // seconds
  const start = Date.now();

  while ((Date.now() - start) / 1000 < maxWait) {
    try {
      const health = await api('GET', `/projects/${ref}/health`, token);

      const allHealthy = health.every(s => s.status === 'ACTIVE_HEALTHY');
      const dbHealthy = health.find(s => s.name === 'db')?.status === 'ACTIVE_HEALTHY';
      const authHealthy = health.find(s => s.name === 'auth')?.status === 'ACTIVE_HEALTHY';
      const restHealthy = health.find(s => s.name === 'rest')?.status === 'ACTIVE_HEALTHY';

      const elapsed = Math.round((Date.now() - start) / 1000);
      const statuses = health.map(s => {
        const icon = s.status === 'ACTIVE_HEALTHY' ? `${G}✓${R}` : `${Y}…${R}`;
        return `${icon} ${s.name}`;
      }).join('  ');
      process.stdout.write(`\r  [${elapsed}s] ${statuses}    `);

      if (allHealthy || (dbHealthy && authHealthy && restHealthy)) {
        console.log('');
        log(`${G}✓${R} All services healthy`);
        return;
      }
    } catch {
      // Project not ready yet
    }

    await sleep(5000);
  }

  console.log('');
  log(`${Y}⚠ Timeout waiting for health — proceeding anyway${R}`);
}

// ─── Step 5: Get API Keys ───
async function getKeys(token, ref) {
  const keys = await api('GET', `/projects/${ref}/api-keys`, token);

  const result = {
    url: `https://${ref}.supabase.co`,
    anonKey: '',
    serviceRoleKey: '',
  };

  for (const key of keys) {
    // New format: publishable/secret
    if (key.name === 'publishable' || key.name === 'anon') {
      result.anonKey = key.api_key;
    }
    if (key.name === 'secret' || key.name === 'service_role') {
      result.serviceRoleKey = key.api_key;
    }
  }

  if (!result.anonKey || !result.serviceRoleKey) {
    throw new Error('Could not retrieve API keys. Check project status at supabase.com/dashboard');
  }

  log(`${G}✓${R} API keys retrieved`);
  return result;
}

// ─── Step 6: Run Migration SQL ───
async function runMigration(token, ref) {
  // Find migration SQL
  const migrationPaths = [
    'supabase/migrations/001_initial_schema.sql',
    'supabase/migrations/20240101_initial_schema.sql',
  ];

  let sql = null;
  let sqlPath = null;

  for (const p of migrationPaths) {
    if (existsSync(p)) {
      sql = readFileSync(p, 'utf-8');
      sqlPath = p;
      break;
    }
  }

  // Also check if PROJECT-SPEC.md has embedded SQL (for pre-build setup)
  if (!sql && existsSync('PROJECT-SPEC.md')) {
    const spec = readFileSync('PROJECT-SPEC.md', 'utf-8');
    // Extract SQL between ```sql blocks in Gate 1
    const sqlBlocks = [];
    const regex = /```sql\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(spec)) !== null) {
      sqlBlocks.push(match[1]);
    }
    if (sqlBlocks.length > 0) {
      sql = sqlBlocks.join('\n\n');
      sqlPath = 'PROJECT-SPEC.md (embedded SQL)';
    }
  }

  if (!sql) {
    log(`${Y}⚠ No migration SQL found — Stage 1 will create it${R}`);
    return false;
  }

  log('');
  log(`Running migration from ${C}${sqlPath}${R}...`);

  try {
    await api('POST', `/projects/${ref}/database/query`, token, { query: sql });
    log(`${G}✓${R} Migration applied successfully`);
    return true;
  } catch (err) {
    log(`${Y}⚠ Migration had errors — Stage 1 will handle it${R}`);
    log(`  ${err.message.substring(0, 200)}`);
    return false;
  }
}

// ─── Step 7: Configure Auth ───
async function configureAuth(token, ref, appUrl = 'http://localhost:3000') {
  log('');
  log('Configuring auth settings...');

  try {
    await api('PATCH', `/projects/${ref}/config/auth`, token, {
      site_url: appUrl,
      uri_allow_list: [
        `${appUrl}/api/auth/callback`,
        `${appUrl}/api/auth/oauth/callback`,
        `${appUrl}/auth/callback`,
      ].join(','),
      external_email_enabled: true,
      mailer_autoconfirm: false,
      security_refresh_token_reuse_interval: 10,
      security_refresh_token_rotation_enabled: true,
    });
    log(`${G}✓${R} Auth configured (redirect URLs, email, token rotation)`);
  } catch (err) {
    log(`${Y}⚠ Auth config partially applied — check dashboard${R}`);
  }
}

// ─── Step 8: Check for Existing Projects ───
async function checkExisting(token, orgId, projectName) {
  try {
    const projects = await api('GET', `/projects`, token);
    const match = projects.find(p =>
      p.name.toLowerCase() === projectName.toLowerCase() &&
      p.organization_id === orgId &&
      p.status === 'ACTIVE_HEALTHY'
    );

    if (match) {
      log(`${Y}Found existing project: ${B}${match.name}${R} (${match.id})`);
      const reuse = await ask('  Use this project? (Y/n): ');
      if (reuse.toLowerCase() !== 'n') {
        return { ref: match.id, dbPass: null };
      }
    }
  } catch {}
  return null;
}

// ═══════════════════════════════════════════
// MAIN — Exported for codebakers.mjs to import
// ═══════════════════════════════════════════

export async function autoProvision(options = {}) {
  const {
    projectName = 'easemail-v2',
    appUrl = 'http://localhost:3000',
    skipMigration = false,
    token: providedToken = null,
  } = options;

  log('');
  log(`${B}${C}═══════════════════════════════════════════${R}`);
  log(`${B}${C}  Supabase Auto-Provisioner${R}`);
  log(`${B}${C}═══════════════════════════════════════════${R}`);

  // 1. Token
  const token = providedToken || await getToken();

  // 2. Organization
  const orgId = await getOrg(token);

  // 3. Check for existing project
  const existing = await checkExisting(token, orgId, projectName);
  let ref, dbPass;

  if (existing) {
    ref = existing.ref;
    dbPass = existing.dbPass;
  } else {
    // 4. Create new project
    const created = await createProject(token, orgId, projectName);
    ref = created.ref;
    dbPass = created.dbPass;

    // 5. Wait for health
    await waitForHealth(token, ref);
  }

  // 6. Get API keys
  const keys = await getKeys(token, ref);

  // 7. Run migration (if available)
  let migrationApplied = false;
  if (!skipMigration) {
    migrationApplied = await runMigration(token, ref);
  }

  // 8. Configure auth
  await configureAuth(token, ref, appUrl);

  // Summary
  log('');
  log(`${B}${G}═══════════════════════════════════════════${R}`);
  log(`${B}${G}  ✓ Supabase Ready${R}`);
  log(`${B}${G}═══════════════════════════════════════════${R}`);
  log('');
  log(`  Project:  ${C}${ref}${R}`);
  log(`  URL:      ${C}${keys.url}${R}`);
  log(`  Region:   us-east-1`);
  log(`  DB:       ${migrationApplied ? `${G}Migration applied${R}` : `${Y}Pending (Stage 1 will create)${R}`}`);
  log('');

  return {
    NEXT_PUBLIC_SUPABASE_URL: keys.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: keys.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: keys.serviceRoleKey,
    SUPABASE_DB_PASSWORD: dbPass,
    SUPABASE_PROJECT_REF: ref,
    SUPABASE_ACCESS_TOKEN: token,
    migrationApplied,
  };
}

// ─── Run standalone ───
if (process.argv[1]?.includes('setup-supabase')) {
  autoProvision()
    .then((result) => {
      log(`${B}Add these to .env.local:${R}`);
      log('');
      log(`NEXT_PUBLIC_SUPABASE_URL=${result.NEXT_PUBLIC_SUPABASE_URL}`);
      log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${result.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
      log(`SUPABASE_SERVICE_ROLE_KEY=${result.SUPABASE_SERVICE_ROLE_KEY}`);
      if (result.SUPABASE_DB_PASSWORD) {
        log(`SUPABASE_DB_PASSWORD=${result.SUPABASE_DB_PASSWORD}`);
      }
      log('');
      rl.close();
    })
    .catch((err) => {
      console.error(`\n  ${D}Error: ${err.message}${R}\n`);
      rl.close();
      process.exit(1);
    });
}
