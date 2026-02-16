# PHASE 9A: PERFORMANCE OPTIMIZATION — EXECUTION PROMPT

**Use this prompt to execute Stage 9A in Claude Code**

---

## PROMPT FOR CLAUDE CODE

```
I'm executing PHASE 9A: Performance Optimization for the EaseMail Redux application.

CONTEXT:
- This is a Next.js 14 email application with Supabase backend
- All features from Phases 1-8 are complete and working
- Current production build is functional but not optimized
- Need to reduce bundle size and improve loading performance

OBJECTIVE:
Optimize application performance through code splitting, lazy loading, and dependency optimization.

TARGET METRICS:
- Initial bundle < 250KB (gzipped)
- Largest route chunk < 150KB
- Lighthouse performance score > 90
- Time to Interactive (TTI) < 3 seconds

---

SECTION A: BUNDLE ANALYSIS (Tasks 210-214)

1. Install and run webpack bundle analyzer:
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```

2. Configure next.config.js to enable analyzer:
   ```javascript
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });

   module.exports = withBundleAnalyzer({
     // existing config
   });
   ```

3. Run analyzer:
   ```bash
   ANALYZE=true npm run build
   ```

4. Create PERFORMANCE-REPORT.md documenting:
   - Total bundle size (before optimization)
   - Largest dependencies (>100KB)
   - Unused dependencies detected
   - Optimization targets prioritized

---

SECTION B: CODE SPLITTING (Tasks 215-222)

Add dynamic imports for heavy components to reduce initial bundle:

1. **Composer component** (EmailComposer + TipTap):
   ```typescript
   // src/components/email/composer-lazy.tsx
   import dynamic from 'next/dynamic';
   import { Loader2 } from 'lucide-react';

   const EmailComposer = dynamic(() => import('./composer').then(mod => ({ default: mod.EmailComposer })), {
     loading: () => (
       <div className="flex h-64 items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     ),
     ssr: false, // TipTap requires client-side rendering
   });

   export { EmailComposer };
   ```

2. **AI Features** (remix, dictate, extract):
   ```typescript
   // src/components/ai/ai-features-lazy.tsx
   import dynamic from 'next/dynamic';

   export const AIRemixDialog = dynamic(() => import('./ai-remix-dialog').then(mod => ({ default: mod.AIRemixDialog })), {
     loading: () => <div>Loading AI features...</div>,
   });

   export const AIDictateButton = dynamic(() => import('./ai-dictate-button').then(mod => ({ default: mod.AIDictateButton })), {
     loading: () => null,
   });

   export const AIExtractEventButton = dynamic(() => import('./ai-extract-event-button').then(mod => ({ default: mod.AIExtractEventButton })), {
     loading: () => null,
   });
   ```

3. **Calendar components**:
   ```typescript
   // src/app/(app)/app/calendar/page.tsx
   import dynamic from 'next/dynamic';

   const CalendarContent = dynamic(() => import('./calendar-content').then(mod => ({ default: mod.CalendarContent })), {
     loading: () => <div>Loading calendar...</div>,
   });
   ```

4. **Admin dashboard**:
   ```typescript
   // src/app/(app)/app/admin/page.tsx
   import dynamic from 'next/dynamic';

   const AdminDashboard = dynamic(() => import('@/components/admin/admin-dashboard'), {
     loading: () => <div>Loading dashboard...</div>,
   });
   ```

5. Update all imports to use lazy-loaded versions
6. Run `npm run build` and verify chunk sizes reduced

---

SECTION C: IMAGE OPTIMIZATION (Tasks 223-227)

1. Search for all <img> tags:
   ```bash
   grep -r "<img" src/ --include="*.tsx" --include="*.jsx"
   ```

2. Replace with next/image:
   ```tsx
   // Before:
   <img src="/logo.png" alt="Logo" />

   // After:
   import Image from 'next/image';
   <Image src="/logo.png" alt="Logo" width={200} height={50} />
   ```

3. Enable Next.js image optimization in next.config.js:
   ```javascript
   images: {
     formats: ['image/webp'],
     deviceSizes: [375, 768, 1024, 1280, 1920],
   }
   ```

4. Verify all images lazy-load (check Network tab in DevTools)

---

SECTION D: DEPENDENCY OPTIMIZATION (Tasks 228-234)

1. **Check for moment.js** (replace with date-fns):
   ```bash
   npm ls moment
   # If found:
   npm uninstall moment
   npm install date-fns
   # Update imports: moment() → new Date() or date-fns functions
   ```

2. **Replace lodash with lodash-es** (tree-shakeable):
   ```bash
   npm uninstall lodash
   npm install lodash-es
   # Update imports: import _ from 'lodash' → import { debounce } from 'lodash-es'
   ```

3. **Audit large dependencies**:
   ```bash
   npx bundlephobia <package-name>
   ```
   Check sizes of:
   - @supabase/supabase-js
   - openai
   - @tiptap/react + extensions
   - framer-motion

4. **Lazy load OpenAI SDK**:
   ```typescript
   // src/lib/ai/client.ts
   async function getOpenAIClient() {
     const { OpenAI } = await import('openai');
     return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
   }
   ```

5. **Run npm dedupe**:
   ```bash
   npm dedupe
   npm prune
   ```

6. **Final build**:
   ```bash
   npm run build
   ```
   Document bundle sizes in PERFORMANCE-REPORT.md

---

EXIT CRITERIA CHECKLIST:

- [ ] PERFORMANCE-REPORT.md created with before/after metrics
- [ ] All heavy components use dynamic imports
- [ ] All images use next/image component
- [ ] Unused dependencies removed
- [ ] npm dedupe run successfully
- [ ] Initial bundle < 250KB (gzipped)
- [ ] Largest route chunk < 150KB
- [ ] Production build passes
- [ ] TypeScript check passes (0 errors)

---

VERIFICATION STEPS:

1. Run Lighthouse audit:
   ```bash
   npm run build
   npm start
   # Open Chrome DevTools > Lighthouse > Run audit
   ```
   - Performance score should be > 90
   - First Contentful Paint < 1.5s
   - Time to Interactive < 3s

2. Check bundle sizes:
   ```bash
   ANALYZE=true npm run build
   ```
   - Review bundle analyzer output
   - Verify no chunks > 150KB

3. Test lazy loading:
   - Open DevTools Network tab
   - Navigate to /app/inbox
   - Verify Composer chunk only loads when clicking "Compose"
   - Verify AI features load on demand

---

HANDOFF NOTES:

After completing this stage:
- Update BUILD-STATE.md with performance metrics
- Commit changes with message: "feat: Phase 9A complete - Performance optimization"
- Proceed to Phase 9B: User Onboarding

```

---

## QUICK EXECUTION CHECKLIST

Use this condensed version if you want to execute quickly:

1. ✅ Install @next/bundle-analyzer
2. ✅ Run ANALYZE=true npm run build
3. ✅ Create PERFORMANCE-REPORT.md
4. ✅ Add dynamic imports to: Composer, AI features, Calendar, Admin
5. ✅ Replace all <img> with next/image
6. ✅ Remove unused dependencies
7. ✅ Run npm dedupe
8. ✅ Verify bundle < 250KB
9. ✅ Run Lighthouse (score > 90)
10. ✅ Update BUILD-STATE.md
