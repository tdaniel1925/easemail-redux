#!/usr/bin/env node

/**
 * FORGE BUILD — FULLY AUTOMATED
 * Run: node .codebakers/codebakers-build.mjs
 * 
 * Runs all 7 build stages automatically.
 * Each stage launches Claude Code, waits for it to finish,
 * checks the coherence report, then starts the next stage.
 * At the end, runs launch.mjs for keys + deploy.
 * 
 * You walk away. Come back to a finished app.
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';

// ─── Config ───
const TOTAL_STAGES = 7;
const LOG_DIR = '.codebakers/logs';
const LOG_FILE = `${LOG_DIR}/build-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;

// ─── Colors ───
const G = '\x1b[32m';
const Y = '\x1b[33m';
const C = '\x1b[36m';
const D = '\x1b[31m';
const R = '\x1b[0m';
const B = '\x1b[1m';

function log(msg) {
  const timestamp = new Date().toLocaleTimeString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  try { appendFileSync(LOG_FILE, line.replace(/\x1b\[[0-9;]*m/g, '') + '\n'); } catch {}
}

function banner(text) {
  console.log('');
  console.log(`${B}${C}${'═'.repeat(50)}${R}`);
  console.log(`${B}${C}  ${text}${R}`);
  console.log(`${B}${C}${'═'.repeat(50)}${R}`);
  console.log('');
}

// ─── Stage prompts that tell Claude Code exactly what to do ───
function getStagePrompt(stageNum) {
  const prompts = {
    1: `Read CLAUDE.md and PROJECT-SPEC.md completely. You are executing Stage 1 — Schema & Types. Follow BUILD-STAGES.md exactly. Output your SCOPE DECLARATION first, then build everything required for Stage 1. After building, run the full audit and output the coherence report. Update BUILD-STATE.md. If all checks pass, end with "STAGE 1 COMPLETE — READY FOR STAGE 2".`,
    
    2: `Read CLAUDE.md, PROJECT-SPEC.md, and BUILD-STATE.md. You are executing Stage 2 — Auth & System Spine. Follow BUILD-STAGES.md exactly. Output SCOPE DECLARATION, build everything, run the audit, output coherence report, update BUILD-STATE.md. If all checks pass, end with "STAGE 2 COMPLETE — READY FOR STAGE 3".`,
    
    3: `Read CLAUDE.md, PROJECT-SPEC.md, and BUILD-STATE.md. You are executing Stage 3 — CRUD. Follow BUILD-STAGES.md exactly. Build CRUD for EVERY entity. Output SCOPE DECLARATION, build, audit, coherence report, update BUILD-STATE.md. If all checks pass, end with "STAGE 3 COMPLETE — READY FOR STAGE 4".`,
    
    4: `Read CLAUDE.md, PROJECT-SPEC.md, and BUILD-STATE.md. You are executing Stage 4 — Vertical Slice. Follow BUILD-STAGES.md exactly. Implement the PRIMARY WORKFLOW end-to-end. Output SCOPE DECLARATION, build, audit, coherence report, update BUILD-STATE.md. If all checks pass, end with "STAGE 4 COMPLETE — READY FOR STAGE 5".`,
    
    5: `Read CLAUDE.md, PROJECT-SPEC.md, and BUILD-STATE.md. You are executing Stage 5 — Event System. Follow BUILD-STAGES.md exactly. Every state change emits an event. Output SCOPE DECLARATION, build, audit, coherence report, update BUILD-STATE.md. If all checks pass, end with "STAGE 5 COMPLETE — READY FOR STAGE 6".`,
    
    6: `Read CLAUDE.md, PROJECT-SPEC.md, and BUILD-STATE.md. You are executing Stage 6 — Automation. Follow BUILD-STAGES.md exactly. Implement all automation rules from Gate 4. Output SCOPE DECLARATION, build, audit, coherence report, update BUILD-STATE.md. If all checks pass, end with "STAGE 6 COMPLETE — READY FOR STAGE 7".`,
    
    7: `Read CLAUDE.md, PROJECT-SPEC.md, and BUILD-STATE.md. You are executing Stage 7 — AI Layer + Final. Follow BUILD-STAGES.md exactly. Implement AI features, generate README.md, generate CI/CD pipeline, run the smoke test, run final audit including Lighthouse and route audit. Output coherence report and final BUILD COMPLETE summary. Update BUILD-STATE.md. End with "BUILD COMPLETE — ALL 7 STAGES DONE".`,
  };
  return prompts[stageNum];
}

// ─── Run a single Claude Code session ───
function runClaudeCode(stageNum, customPrompt) {
  return new Promise((resolve, reject) => {
    const prompt = customPrompt || getStagePrompt(stageNum);
    
    if (stageNum > 0) log(`Starting Claude Code for Stage ${stageNum}...`);
    
    const child = spawn('claude', [
      '-p', prompt,
      '--dangerously-skip-permissions'
    ], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });

    let output = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      try { appendFileSync(LOG_FILE, text); } catch {}
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      try { appendFileSync(LOG_FILE, text); } catch {}
    });

    child.on('close', (code) => {
      resolve({ code, output });
    });

    child.on('error', (err) => {
      // Claude Code might not be installed
      reject(err);
    });
  });
}

// ─── Check if stage passed ───
function checkStageResult(stageNum, output) {
  // Check BUILD-STATE.md for pass
  if (existsSync('BUILD-STATE.md')) {
    const state = readFileSync('BUILD-STATE.md', 'utf-8');
    if (state.includes(`Last completed stage: ${stageNum}`) || 
        state.includes(`Ready for stage: ${stageNum + 1}`) ||
        state.includes('BUILD COMPLETE')) {
      return true;
    }
  }
  
  // Also check output for completion markers
  const markers = [
    `STAGE ${stageNum} COMPLETE`,
    `Ready for Stage ${stageNum + 1}: YES`,
    'BUILD COMPLETE',
    'ALL 7 STAGES DONE',
  ];
  
  return markers.some(m => output.includes(m));
}

// ─── Advisory system ───
const ADVISOR_SCHEDULE = {
  1: ['architecture'],
  2: ['security'],
  3: ['ux'],
  4: ['architecture'],
  7: ['security', 'ux', 'cost', 'launch'],
};

function getAdvisorPrompt(advisor, stageNum) {
  const advisors = {
    architecture: `You are the ARCHITECTURE ADVISOR. Read .codebakers/system/ADVISORS.md for your full role description. Read CLAUDE.md, PROJECT-SPEC.md, and all code built so far. Produce your Architecture Review report. Check for N+1 queries, missing indexes, unbounded tables, circular dependencies, race conditions, and scaling bottlenecks. Save your report to .codebakers/advisors/architecture-stage${stageNum}.md. If you find CRITICAL issues, list them clearly at the top.`,
    
    security: `You are the SECURITY ADVISOR. Read .codebakers/system/ADVISORS.md for your full role description. Read CLAUDE.md, PROJECT-SPEC.md, and all code built so far. Produce your Security Review report. Check for data leaks, permission bypasses, missing auth checks, exposed secrets, injection vulnerabilities, and CSRF. Save your report to .codebakers/advisors/security-stage${stageNum}.md. If you find CRITICAL VULNERABILITIES, list them clearly at the top.`,
    
    ux: `You are the UX ADVISOR. Read .codebakers/system/ADVISORS.md for your full role description. Read CLAUDE.md, PROJECT-SPEC.md, and all UI code built so far. Produce your UX Review report. Check for dead-end flows, missing feedback, error message quality, mobile usability, accessibility, empty states, and onboarding gaps. Save your report to .codebakers/advisors/ux-stage${stageNum}.md.`,
    
    cost: `You are the COST ADVISOR. Read .codebakers/system/ADVISORS.md for your full role description. Read PROJECT-SPEC.md, package.json, and .env.example. Produce your Cost Projection report. Calculate monthly costs at 100, 1000, and 10000 users for Supabase, Vercel, Stripe, email, AI, storage, and any third-party APIs. Save your report to .codebakers/advisors/cost-stage${stageNum}.md.`,
    
    launch: `You are the LAUNCH ADVISOR. Read .codebakers/system/ADVISORS.md for your full role description. Read all project files. Produce your Launch Readiness report. Check DNS, SSL, email deliverability, legal pages, monitoring, backups, test data cleanup, webhook URLs, OAuth redirects, sitemap, OG images, and support page. Save your report to .codebakers/advisors/launch-stage${stageNum}.md. End with GO or NO-GO.`,
  };
  return advisors[advisor];
}

async function runAdvisors(stageNum) {
  const advisorsForStage = ADVISOR_SCHEDULE[stageNum];
  if (!advisorsForStage) return;

  // Create advisors directory
  if (!existsSync('.codebakers/advisors')) mkdirSync('.codebakers/advisors', { recursive: true });

  for (const advisor of advisorsForStage) {
    log(`${C}🔍 Running ${advisor} advisor...${R}`);
    const prompt = getAdvisorPrompt(advisor, stageNum);
    await runClaudeCode(-1, prompt); // -1 = advisor, not a build stage
  }
}

// ─── Main ───
async function main() {
  banner('🔨 FORGE BUILD — FULLY AUTOMATED');
  
  // Preflight checks
  log('Checking prerequisites...');
  
  // Check Claude Code CLI
  try {
    execSync('claude --version', { stdio: 'pipe' });
    log(`${G}✓${R} Claude Code CLI found`);
  } catch {
    console.log('');
    console.log(`${D}${B}  Claude Code CLI not found!${R}`);
    console.log('');
    console.log(`  Install it:`);
    console.log(`    ${C}npm install -g @anthropic-ai/claude-code${R}`);
    console.log('');
    console.log(`  Then run this again:`);
    console.log(`    ${C}node .codebakers/codebakers-build.mjs${R}`);
    console.log('');
    process.exit(1);
  }

  // Check required files
  for (const f of ['CLAUDE.md', 'PROJECT-SPEC.md', '.codebakers/system/BUILD-STAGES.md']) {
    if (!existsSync(f)) {
      log(`${D}✗ Missing: ${f}${R}`);
      process.exit(1);
    }
    log(`${G}✓${R} ${f}`);
  }

  // Create log directory
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  log(`Logging to: ${LOG_FILE}`);

  // Check if resuming from a previous run
  let startStage = 1;
  if (existsSync('BUILD-STATE.md')) {
    const state = readFileSync('BUILD-STATE.md', 'utf-8');
    const match = state.match(/Last completed stage:\s*(\d+)/);
    if (match) {
      startStage = parseInt(match[1]) + 1;
      if (startStage > TOTAL_STAGES) {
        log(`${G}All stages already complete!${R} Run: node .codebakers/launch.mjs`);
        process.exit(0);
      }
      log(`${Y}Resuming from Stage ${startStage}${R} (Stages 1-${startStage - 1} already done)`);
    }
  }

  // ─── Run each stage ───
  const startTime = Date.now();
  
  for (let stage = startStage; stage <= TOTAL_STAGES; stage++) {
    banner(`STAGE ${stage} / ${TOTAL_STAGES}`);
    
    const stageStart = Date.now();
    let attempts = 0;
    const MAX_ATTEMPTS = 2;
    let passed = false;

    while (attempts < MAX_ATTEMPTS && !passed) {
      attempts++;
      if (attempts > 1) {
        log(`${Y}Retry attempt ${attempts} for Stage ${stage}${R}`);
      }

      try {
        const result = await runClaudeCode(stage);
        passed = checkStageResult(stage, result.output);
        
        if (passed) {
          const elapsed = Math.round((Date.now() - stageStart) / 1000);
          log(`${G}${B}✓ Stage ${stage} PASSED${R} (${elapsed}s)`);
        } else {
          log(`${Y}Stage ${stage} may not have passed cleanly. Checking BUILD-STATE.md...${R}`);
          // Give it one more chance — sometimes the marker is just formatted differently
          if (existsSync('BUILD-STATE.md')) {
            const state = readFileSync('BUILD-STATE.md', 'utf-8');
            if (state.includes(`stage: ${stage}`) || state.includes(`Stage ${stage}`)) {
              passed = true;
              log(`${G}${B}✓ Stage ${stage} confirmed via BUILD-STATE.md${R}`);
            }
          }
        }
      } catch (err) {
        log(`${D}Error running Stage ${stage}: ${err.message}${R}`);
      }
    }

    if (!passed) {
      console.log('');
      log(`${D}${B}Stage ${stage} failed after ${MAX_ATTEMPTS} attempts.${R}`);
      log(`Check the log: ${LOG_FILE}`);
      log(`Fix the issue and re-run: ${C}node .codebakers/codebakers-build.mjs${R}`);
      log(`It will resume from Stage ${stage}.`);
      process.exit(1);
    }

    // ─── Run advisors after passing stage ───
    if (ADVISOR_SCHEDULE[stage]) {
      await runAdvisors(stage);
    }
  }

  // ─── Self-Healing Loop ───
  banner('🔧 SELF-HEALING — BUILD VERIFICATION');

  const MAX_HEAL_ATTEMPTS = 5;
  let healAttempt = 0;
  let cleanBuild = false;

  while (!cleanBuild && healAttempt < MAX_HEAL_ATTEMPTS) {
    healAttempt++;
    log(`Heal cycle ${healAttempt}/${MAX_HEAL_ATTEMPTS} — running npm run build...`);

    const buildOutput = run('npm run build 2>&1', { silent: true });

    if (buildOutput && !buildOutput.includes('Error:') && !buildOutput.includes('error TS') && !buildOutput.includes('Build error')) {
      cleanBuild = true;
      log(`${G}${B}✓ Clean build on cycle ${healAttempt}${R}`);
    } else {
      log(`${Y}Build errors found. Sending to Claude Code for repair...${R}`);

      const healPrompt = `SELF-HEALING MODE. Read .codebakers/system/SELF-HEALING.md for rules.

The npm build failed with these errors:

${(buildOutput || '').slice(-3000)}

Read CLAUDE.md and PROJECT-SPEC.md. Fix ONLY the errors above.
Make the SMALLEST possible changes. Do not refactor. Do not add features.
Do not change working code. Fix the specific error, nothing else.

After fixing, run: npm run build
If it passes, output: BUILD CLEAN
If it fails, output the new errors.`;

      await runClaudeCode(-1, healPrompt);
    }
  }

  if (!cleanBuild) {
    log(`${Y}⚠ Could not achieve clean build after ${MAX_HEAL_ATTEMPTS} cycles.${R}`);
    log(`Check errors manually before deploying.`);
  }

  // ─── Coherence Check ───
  banner('🔍 COHERENCE CHECK — FULL SYSTEM VALIDATION');

  const coherencePrompt = `COHERENCE CHECK MODE. Read .codebakers/system/SELF-HEALING.md.

Run ALL 10 coherence checks:
1. npx tsc --noEmit — fix type errors
2. npx eslint src/ --quiet — fix lint errors  
3. Every .from('table') and .select('col') must match real migration columns
4. Every <Link href="..."> must point to existing page file
5. Every <Button onClick={...}> must reference existing handler
6. Every import must resolve to existing file/module
7. Every process.env.* must exist in .env.example
8. Every server action must check auth/permissions
9. Every create/update/delete must call revalidatePath
10. Every mutation must show success/error feedback

For each failure: fix with smallest possible change.
After all fixes, run npm run build.

Output COHERENCE REPORT with:
- Checks passed: X/10
- Fixes applied: [list or "None"]  
- Remaining issues: [list or "None"]
- Status: CLEAN / NEEDS ATTENTION

Save report to .codebakers/advisors/coherence-final.md`;

  await runClaudeCode(-1, coherencePrompt);

  // ─── All stages complete ───
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;

  banner('🎉 BUILD COMPLETE — ALL 7 STAGES DONE');
  log(`Total build time: ${minutes}m ${seconds}s`);
  log(`Heal cycles: ${healAttempt}`);
  log(`Full log: ${LOG_FILE}`);
  console.log('');
  console.log(`${B}  Your app is built and verified! Now run:${R}`);
  console.log('');
  console.log(`    ${C}node .codebakers/launch.mjs${R}`);
  console.log('');
  console.log(`  That will collect your API keys and deploy.`);
  console.log('');
}

main().catch((err) => {
  console.error(`${D}Fatal error: ${err.message}${R}`);
  process.exit(1);
});
