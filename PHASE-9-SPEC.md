# PHASE 9: PERFORMANCE + ONBOARDING + FINAL POLISH

**Status**: Ready for execution
**Estimated Time**: 4-5 hours
**Token Budget**: 70-90K tokens
**Context Strategy**: Single session (all stages fit in one context)

---

## Overview

Phase 9 is the final polish phase before production deployment. It focuses on:
1. **Performance optimization** - Code splitting, lazy loading, bundle size reduction
2. **User onboarding** - Welcome flow for new users connecting first account
3. **UX enhancements** - Keyboard shortcuts help, success feedback, confirmations

---

## STAGE 9A: PERFORMANCE OPTIMIZATION

**Estimated Time**: 1.5-2 hours
**Token Budget**: 25-30K tokens
**Dependencies**: None (optimizes existing code)

### Objective
Reduce initial bundle size, improve Time to Interactive (TTI), optimize images and assets

### Tasks (25 total)

#### Section A: Bundle Analysis (Tasks 210-214)
210. ✅ Run webpack bundle analyzer
211. ✅ Identify largest dependencies (>100KB)
212. ✅ Identify unused dependencies
213. ✅ Create optimization report (PERFORMANCE-REPORT.md)
214. ✅ Prioritize optimization targets

#### Section B: Code Splitting (Tasks 215-222)
215. ✅ Add dynamic import to Composer component
216. ✅ Add dynamic import to EventForm component
217. ✅ Add dynamic import to AI features (remix, dictate, extract)
218. ✅ Add dynamic import to TipTap editor
219. ✅ Add dynamic import to Calendar components
220. ✅ Add dynamic import to Admin dashboard
221. ✅ Verify route-based code splitting working
222. ✅ Measure bundle size reduction

#### Section C: Image Optimization (Tasks 223-227)
223. ✅ Convert all PNGs to WebP (if any exist)
224. ✅ Add next/image to all <img> tags
225. ✅ Set explicit width/height on all images
226. ✅ Enable Next.js image optimization
227. ✅ Verify images lazy-load correctly

#### Section D: Dependency Optimization (Tasks 228-234)
228. ✅ Replace moment.js with date-fns (if used)
229. ✅ Replace lodash with lodash-es (tree-shakeable)
230. ✅ Remove unused UI libraries
231. ✅ Audit @supabase package sizes
232. ✅ Audit OpenAI SDK size (consider lazy load)
233. ✅ Run npm dedupe
234. ✅ Measure final bundle size

### Exit Criteria
- ✅ Initial bundle < 250KB (compressed)
- ✅ Largest route chunk < 150KB
- ✅ Lighthouse performance score > 90
- ✅ Time to Interactive (TTI) < 3 seconds
- ✅ All images use next/image
- ✅ Dynamic imports for all heavy components
- ✅ PERFORMANCE-REPORT.md created

### Files to Create
- PERFORMANCE-REPORT.md

### Files to Modify
- All components with heavy dependencies (add dynamic imports)
- next.config.js (enable image optimization, webpack config)
- package.json (remove unused deps, add optimized alternatives)

---

## STAGE 9B: USER ONBOARDING

**Estimated Time**: 1.5-2 hours
**Token Budget**: 25-30K tokens
**Dependencies**: None

### Objective
Create a welcoming first-run experience that guides new users through connecting their first email account

### Tasks (20 total)

#### Section A: Welcome Screen (Tasks 235-240)
235. ✅ Create WelcomeScreen component
236. ✅ Add illustration/hero image
237. ✅ Add "Get Started" CTA button
238. ✅ Add feature highlights (3-4 key features)
239. ✅ Show only if user has 0 connected accounts
240. ✅ Redirect to /app/inbox after account connected

#### Section B: Account Connection Wizard (Tasks 241-246)
241. ✅ Create ConnectAccountDialog component
242. ✅ Add Google OAuth button
243. ✅ Add Microsoft OAuth button
244. ✅ Add provider comparison (features table)
245. ✅ Add "Skip for now" option
246. ✅ Auto-open on first visit if no accounts

#### Section C: First Message Walkthrough (Tasks 247-251)
247. ✅ Create OnboardingTour component (using react-joyride or similar)
248. ✅ Add tour step 1: Account switcher explanation
249. ✅ Add tour step 2: Compose button highlight
250. ✅ Add tour step 3: Smart inbox sections explanation
251. ✅ Add tour step 4: Settings location
252. ✅ Store tour completion in user_preferences
253. ✅ "Skip tour" and "Next" buttons

#### Section D: Preference Setup (Tasks 254-254)
254. ✅ Create QuickPreferences component
     - Theme selection (light/dark)
     - Enable vacation responder? (skip)
     - Enable read receipts by default? (checkbox)
     - Save and continue

### Exit Criteria
- ✅ New user sees welcome screen on first visit
- ✅ Welcome screen shows when 0 accounts connected
- ✅ Account connection wizard guides OAuth flow
- ✅ Onboarding tour highlights key UI elements
- ✅ User can skip any onboarding step
- ✅ Tour completion persisted to database
- ✅ Onboarding doesn't show on subsequent visits

### Files to Create
- src/components/onboarding/welcome-screen.tsx
- src/components/onboarding/connect-account-dialog.tsx
- src/components/onboarding/onboarding-tour.tsx
- src/components/onboarding/quick-preferences.tsx
- src/hooks/use-onboarding.ts

### Files to Modify
- src/app/(app)/app/inbox/page.tsx (show welcome screen if no accounts)
- src/app/(app)/app/layout.tsx (initialize onboarding tour)
- src/types/database.ts (add onboarding fields to user_preferences)

---

## STAGE 9C: ADVANCED UX POLISH

**Estimated Time**: 1-1.5 hours
**Token Budget**: 20-30K tokens
**Dependencies**: None

### Objective
Add finishing touches: keyboard shortcuts help, success feedback, confirmation dialogs

### Tasks (20 total)

#### Section A: Keyboard Shortcuts Help (Tasks 255-260)
255. ✅ Create KeyboardShortcutsDialog component
256. ✅ List all existing shortcuts:
     - `C` - Compose new email
     - `R` - Reply
     - `F` - Forward
     - `/` - Focus search
     - `?` - Show shortcuts help
     - `Esc` - Close modal/dialog
     - `Cmd/Ctrl + Enter` - Send email
257. ✅ Add keyboard icon in header
258. ✅ Open dialog on `?` keypress
259. ✅ Group shortcuts by category (Navigation, Actions, Composer)
260. ✅ Show OS-specific modifiers (Cmd on Mac, Ctrl on Windows)

#### Section B: Success Toasts (Tasks 261-268)
261. ✅ Add success toast on email sent
262. ✅ Add success toast on email archived
263. ✅ Add success toast on email deleted
264. ✅ Add success toast on sender blocked
265. ✅ Add success toast on calendar event created
266. ✅ Add success toast on signature saved
267. ✅ Add success toast on vacation responder enabled
268. ✅ Verify all toasts auto-dismiss after 3 seconds

#### Section C: Confirmation Dialogs (Tasks 269-274)
269. ✅ Create ConfirmDialog reusable component
270. ✅ Add confirmation before deleting email (permanent delete)
271. ✅ Add confirmation before blocking sender
272. ✅ Add confirmation before deleting signature
273. ✅ Add confirmation before deleting calendar event
274. ✅ Add "Don't ask again" checkbox option

### Exit Criteria
- ✅ Keyboard shortcuts dialog shows all shortcuts
- ✅ Dialog opens on `?` keypress
- ✅ Success toasts appear on all major actions
- ✅ Confirmation dialogs prevent accidental destructive actions
- ✅ All dialogs use consistent styling (shadcn)
- ✅ TypeScript build passing

### Files to Create
- src/components/ui/keyboard-shortcuts-dialog.tsx
- src/components/ui/confirm-dialog.tsx

### Files to Modify
- src/app/(app)/app/layout.tsx (add global keyboard listener for `?`)
- src/components/inbox/message-view.tsx (add confirmations)
- src/components/email/composer.tsx (success toast on send)
- src/components/calendar/event-form.tsx (confirmations)
- src/components/settings/signature-form.tsx (confirmations)
- src/app/(app)/app/settings/signatures/page.tsx (confirmations)

---

## VERIFICATION & HANDOFF (Tasks 275-280)

275. ✅ Run Lighthouse audit (Performance, Accessibility, Best Practices, SEO)
276. ✅ Verify production build passes
277. ✅ Run TypeScript check (0 errors)
278. ✅ Test onboarding flow with fresh user
279. ✅ Update BUILD-STATE.md with Phase 9 summary
280. ✅ Update PERFORMANCE-REPORT.md with final metrics

---

## OVERALL EXIT CRITERIA

**Performance**:
- ✅ Initial bundle < 250KB (gzipped)
- ✅ Lighthouse score > 90
- ✅ TTI < 3 seconds

**Onboarding**:
- ✅ New users see welcome screen
- ✅ Account connection wizard works
- ✅ Onboarding tour completes successfully

**UX Polish**:
- ✅ Keyboard shortcuts dialog functional
- ✅ Success toasts on all actions
- ✅ Confirmation dialogs prevent mistakes

**Code Quality**:
- ✅ TypeScript: 0 errors
- ✅ Production build: SUCCESS
- ✅ No console.log in production code

---

## ESTIMATED TIMELINE

| Stage | Time | Token Budget |
|-------|------|--------------|
| 9A: Performance | 1.5-2h | 25-30K |
| 9B: Onboarding | 1.5-2h | 25-30K |
| 9C: UX Polish | 1-1.5h | 20-30K |
| **Total** | **4-5h** | **70-90K** |

---

## READY TO EXECUTE

All stages can be completed in a single Claude Code session (90K tokens < 200K budget).

Proceed with:
```
Execute Phase 9A: Performance Optimization
```

Or execute all stages sequentially:
```
Execute Phase 9 (all stages: 9A + 9B + 9C)
```
