# SELF-HEALING BUILD SYSTEM

## Overview

After Stage 7 completes and before launch, the build system enters a HEALING LOOP. 
It runs `npm run build`, checks for errors, fixes them, and repeats until the app 
builds clean. Then it runs the full coherence check to make sure fixes didn't break 
anything else.

This replaces the old "fix and pray" approach. The system doesn't stop until the 
app is clean or it's tried MAX_HEAL_ATTEMPTS times.

---

## HEALING LOOP LOGIC

```
AFTER STAGE 7:
│
├─→ RUN: npm run build
│   ├── PASS → continue to COHERENCE CHECK
│   └── FAIL → enter HEAL CYCLE
│
├─→ HEAL CYCLE (max 5 attempts per error type):
│   │
│   ├── 1. CAPTURE all errors from build output
│   ├── 2. CLASSIFY each error:
│   │   ├── TYPE_ERROR → fix type mismatch
│   │   ├── IMPORT_ERROR → fix missing/wrong import
│   │   ├── MISSING_MODULE → npm install the package
│   │   ├── SYNTAX_ERROR → fix syntax
│   │   ├── ROUTE_ERROR → fix page/layout structure
│   │   ├── ENV_ERROR → add missing env var to .env.example
│   │   ├── RLS_ERROR → fix Supabase policy
│   │   └── UNKNOWN → log and flag for manual review
│   │
│   ├── 3. FIX each error (smallest possible change)
│   ├── 4. RUN: npm run build again
│   ├── 5. If new errors → loop back to step 1
│   ├── 6. If same errors persist after 3 attempts → flag as UNRESOLVABLE
│   └── 7. If clean build → continue to COHERENCE CHECK
│
├─→ COHERENCE CHECK:
│   │
│   ├── 1. TSC CHECK: npx tsc --noEmit (zero errors)
│   ├── 2. LINT CHECK: npx eslint src/ --quiet (zero errors)
│   ├── 3. COLUMN SYNC: every Supabase query references real columns
│   ├── 4. ROUTE CHECK: every Link href points to existing page
│   ├── 5. BUTTON CHECK: every onClick/action is wired to real function
│   ├── 6. IMPORT CHECK: every import resolves to existing file/module
│   ├── 7. ENV CHECK: every process.env reference exists in .env.example
│   ├── 8. PERMISSION CHECK: every server action checks user role
│   ├── 9. REVALIDATION CHECK: every mutation calls revalidatePath
│   └── 10. FEEDBACK CHECK: every mutation has success/error toast
│   │
│   ├── ALL PASS → continue to DEPLOY
│   └── ANY FAIL → fix and re-run COHERENCE CHECK (max 3 loops)
│
├─→ DEPLOY CHECK (after Vercel deploy):
│   │
│   ├── 1. Wait for Vercel build to complete
│   ├── 2. Fetch the deployed URL — does it return 200?
│   ├── 3. Fetch /api/health — does it return { status: 'ok' }?
│   ├── 4. Check Vercel build logs for warnings
│   └── 5. If deploy fails → read Vercel logs, fix, redeploy (max 3 attempts)
│
└─→ DONE — app is live and verified
```

---

## IMPLEMENTATION IN FORGE-BUILD

Add this between Stage 7 completion and the launch phase:

```javascript
// After Stage 7 passes, enter healing loop
async function healingLoop(projectDir, maxAttempts = 5) {
  let attempt = 0;
  let clean = false;
  
  while (!clean && attempt < maxAttempts) {
    attempt++;
    log(`🔧 Heal cycle ${attempt}/${maxAttempts}`);
    
    // Run build
    const buildResult = run('npm run build 2>&1', { silent: true, ok: true });
    
    if (buildResult && !buildResult.includes('Error') && !buildResult.includes('error')) {
      clean = true;
      log(`${G}✓ Clean build on attempt ${attempt}${R}`);
      break;
    }
    
    // Extract errors and send to Claude Code to fix
    const healPrompt = `
      The npm build failed with these errors:
      
      ${buildResult}
      
      Read CLAUDE.md and PROJECT-SPEC.md. Fix ONLY the errors above.
      Make the SMALLEST possible changes. Do not refactor.
      Do not add features. Do not change working code.
      
      After fixing, run: npm run build
      If it passes, output: BUILD CLEAN
      If new errors appear, output them clearly.
    `;
    
    await runClaudeCode(-1, healPrompt);
  }
  
  if (!clean) {
    log(`${Y}⚠ Could not achieve clean build after ${maxAttempts} attempts.${R}`);
    log(`Check the errors manually before deploying.`);
  }
  
  return clean;
}

// After healing, run coherence check
async function coherenceCheck(projectDir) {
  const checkPrompt = `
    Read CLAUDE.md and PROJECT-SPEC.md.
    Run ALL of these checks and fix any failures:
    
    1. npx tsc --noEmit — fix any type errors
    2. npx eslint src/ --quiet — fix any lint errors
    3. Scan every .from('table') and .select('col') — verify columns exist in migrations
    4. Scan every <Link href="..."> — verify page file exists at that path
    5. Scan every <Button onClick={...}> — verify handler function exists
    6. Scan every import statement — verify target file/module exists
    7. Scan every process.env.* — verify it exists in .env.example
    8. Scan every server action — verify it checks auth/permissions
    9. Scan every create/update/delete action — verify revalidatePath called
    10. Scan every mutation — verify success/error feedback (toast or inline)
    
    For each failure: fix it with the smallest possible change.
    After all fixes, run npm run build one more time.
    
    Output a COHERENCE REPORT:
    - Checks passed: X/10
    - Fixes applied: [list]
    - Remaining issues: [list or "None"]
    - Status: CLEAN / NEEDS ATTENTION
  `;
  
  return runClaudeCode(-1, checkPrompt);
}
```

---

## POST-DEPLOY VERIFICATION

After Vercel deployment, verify the live app:

```javascript
async function verifyDeploy(url) {
  const checks = [
    { name: 'Homepage loads', path: '/', expect: 200 },
    { name: 'Health check', path: '/api/health', expect: 200 },
    { name: 'Auth page loads', path: '/auth/login', expect: 200 },
    { name: 'Protected route redirects', path: '/dashboard', expect: 302 },
  ];
  
  for (const check of checks) {
    const res = await fetch(`${url}${check.path}`, { redirect: 'manual' });
    if (res.status === check.expect) {
      log(`${G}✓ ${check.name} (${res.status})${R}`);
    } else {
      log(`${D}✗ ${check.name} — expected ${check.expect}, got ${res.status}${R}`);
    }
  }
}
```

---

## ERROR CLASSIFICATION PATTERNS

Common build errors and their fixes:

| Error Pattern | Classification | Auto-Fix |
|---|---|---|
| `Type 'X' is not assignable to type 'Y'` | TYPE_ERROR | Update type or add assertion |
| `Module not found: Can't resolve 'X'` | IMPORT_ERROR | Fix import path or install package |
| `Cannot find module 'X'` | MISSING_MODULE | npm install X |
| `Unexpected token` | SYNTAX_ERROR | Fix syntax at indicated line |
| `'X' is not exported from 'Y'` | IMPORT_ERROR | Fix named export/import |
| `Property 'X' does not exist on type 'Y'` | TYPE_ERROR | Add property to type or fix reference |
| `Route "X" conflicts with "Y"` | ROUTE_ERROR | Fix route file structure |
| `NEXT_PUBLIC_X is not defined` | ENV_ERROR | Add to .env.example and .env.local |
| `relation "X" does not exist` | RLS_ERROR | Fix migration or table name |
| `column "X" does not exist` | COLUMN_SYNC | Fix column name to match migration |

---

## RULES

1. **Smallest possible fix.** Never refactor during healing. Fix the error, nothing else.
2. **Track what changed.** Every heal cycle logs what files were modified.
3. **Don't create new bugs.** After every fix, rebuild to verify the fix didn't break something else.
4. **Know when to stop.** After 5 heal cycles, if the same error persists, it needs human attention.
5. **Coherence check is non-negotiable.** Even if the build passes, coherence might be broken (e.g., a button that builds fine but isn't wired to anything).
6. **Post-deploy check is non-negotiable.** A passing build doesn't mean the app works. Verify the live URL.
