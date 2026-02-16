# PHASE 9 EXECUTION INDEX

**Created**: February 15, 2026
**Status**: Ready for execution
**Total Time**: 4-5 hours
**Token Budget**: 70-90K tokens (fits in single session)

---

## Quick Start

To execute Phase 9, use these commands in Claude Code:

### Execute All Stages (Recommended)
```
I want to execute Phase 9 (all 3 stages). Read PHASE-9-SPEC.md and execute tasks 210-280 systematically.
```

### Execute Individual Stages

**Stage 9A: Performance** (~2 hours, 25-30K tokens)
```
Execute Phase 9A: Performance Optimization
Read PHASE-9A-PERFORMANCE.md and complete tasks 210-234.
```

**Stage 9B: Onboarding** (~2 hours, 25-30K tokens)
```
Execute Phase 9B: User Onboarding
Read PHASE-9B-ONBOARDING.md and complete tasks 235-254.
```

**Stage 9C: UX Polish** (~1.5 hours, 20-30K tokens)
```
Execute Phase 9C: Advanced UX Polish
Read PHASE-9C-UX-POLISH.md and complete tasks 255-274.
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `PHASE-9-SPEC.md` | Master specification (overview of all 3 stages) |
| `PHASE-9A-PERFORMANCE.md` | Detailed prompt for performance optimization |
| `PHASE-9B-ONBOARDING.md` | Detailed prompt for user onboarding |
| `PHASE-9C-UX-POLISH.md` | Detailed prompt for UX polish |
| `PHASE-9-INDEX.md` | This file (quick reference) |

---

## Task Breakdown

### Stage 9A: Performance Optimization (Tasks 210-234)
- ✅ Bundle analysis with webpack analyzer
- ✅ Code splitting for heavy components (Composer, AI, Calendar, Admin)
- ✅ Image optimization (next/image, WebP)
- ✅ Dependency optimization (remove unused, tree-shake)
- **Goal**: Bundle < 250KB, Lighthouse > 90

### Stage 9B: User Onboarding (Tasks 235-254)
- ✅ Welcome screen for new users
- ✅ Account connection wizard
- ✅ Interactive product tour (react-joyride)
- ✅ Quick preferences setup
- **Goal**: Smooth first-run experience

### Stage 9C: UX Polish (Tasks 255-274)
- ✅ Keyboard shortcuts help dialog (press `?`)
- ✅ Success toasts for all major actions
- ✅ Confirmation dialogs for destructive actions
- **Goal**: Professional UX with safeguards

### Verification (Tasks 275-280)
- ✅ Lighthouse audit
- ✅ Production build verification
- ✅ TypeScript check
- ✅ Test onboarding flow
- ✅ Update documentation

---

## Prerequisites

Before starting Phase 9:
- ✅ Phases 1-8 complete (all features working)
- ✅ Phase 8A complete (mobile responsive)
- ✅ Phase 8B complete (dark mode + loading states)
- ✅ Production build passing
- ✅ TypeScript: 0 errors

---

## Exit Criteria

After Phase 9 completion:
- ✅ Initial bundle < 250KB (gzipped)
- ✅ Lighthouse performance > 90
- ✅ Time to Interactive < 3 seconds
- ✅ New users see welcome screen
- ✅ Onboarding tour works
- ✅ Keyboard shortcuts dialog functional
- ✅ Success toasts on all actions
- ✅ Confirmation dialogs prevent mistakes
- ✅ TypeScript: 0 errors
- ✅ Production build: SUCCESS

---

## Files to Create (Phase 9)

**Performance**:
- PERFORMANCE-REPORT.md
- Lazy-loaded component wrappers

**Onboarding**:
- src/components/onboarding/welcome-screen.tsx
- src/components/onboarding/connect-account-dialog.tsx
- src/components/onboarding/onboarding-tour.tsx
- src/components/onboarding/quick-preferences.tsx
- src/hooks/use-onboarding.ts

**UX Polish**:
- src/components/ui/keyboard-shortcuts-dialog.tsx
- src/components/ui/confirm-dialog.tsx

---

## Files to Modify (Phase 9)

**Performance**:
- next.config.js (bundle analyzer, image optimization)
- package.json (optimize dependencies)
- All heavy component imports (add dynamic imports)

**Onboarding**:
- src/app/(app)/app/inbox/page.tsx (show welcome screen)
- src/app/(app)/app/layout.tsx (add onboarding tour)
- src/types/database.ts (add onboarding fields)

**UX Polish**:
- src/app/(app)/app/layout.tsx (keyboard listener)
- src/components/inbox/message-view.tsx (confirmations, toasts)
- src/components/email/composer.tsx (success toast)
- src/components/calendar/event-form.tsx (confirmation)
- src/components/settings/signature-form.tsx (confirmation)

---

## Estimated Timeline

| Stage | Tasks | Time | Tokens |
|-------|-------|------|--------|
| 9A: Performance | 210-234 (25) | 1.5-2h | 25-30K |
| 9B: Onboarding | 235-254 (20) | 1.5-2h | 25-30K |
| 9C: UX Polish | 255-274 (20) | 1-1.5h | 20-30K |
| Verification | 275-280 (6) | 0.5h | 5-10K |
| **Total** | **71 tasks** | **4-5h** | **75-100K** |

---

## Token Budget Analysis

**Current Context (after Phase 8B)**:
- Used: ~114K / 200K (57%)
- Remaining: ~86K tokens

**Phase 9 Requirements**:
- Estimated: 75-100K tokens
- ✅ **Fits in current context** (with room to spare)

**Recommendation**:
Execute all 3 stages in the current session. If context runs low after 9A+9B, you can complete 9C in a fresh session (it's the smallest stage).

---

## Success Metrics

**Performance** (after 9A):
- Initial bundle: < 250KB (current: unknown)
- Lighthouse: > 90 (current: unknown)
- TTI: < 3s (current: unknown)

**User Experience** (after 9B + 9C):
- New user completion rate: target 80%+
- Time to first email sent: target < 5 minutes
- User satisfaction: professional polish

**Code Quality** (after all stages):
- TypeScript errors: 0
- Build warnings: minimal
- Bundle size: optimized
- Load time: fast

---

## Post-Phase 9 Deployment

After completing Phase 9, the application is **production-ready**. Next steps:

1. **Apply pending migrations**:
   - supabase/migrations/010_realtime_sync.sql
   - supabase/migrations/011_undo_send.sql
   - supabase/migrations/012_vacation_responder.sql

2. **Configure external services**:
   - Google Pub/Sub topic for webhooks
   - Supabase Storage bucket for attachments
   - Environment variables for production

3. **Deploy**:
   - Push to Vercel/hosting platform
   - Run smoke tests
   - Monitor performance
   - Celebrate! 🎉

---

## Quick Reference

**Start Phase 9**:
```bash
# Open Claude Code
# Load this repository
# Say: "Execute Phase 9 - read PHASE-9-SPEC.md and complete all tasks"
```

**Check Progress**:
- BUILD-STATE.md - cumulative state
- PERFORMANCE-REPORT.md - performance metrics (after 9A)
- Git log - commits per stage

**Verify Completion**:
```bash
npx tsc --noEmit  # 0 errors
npm run build     # SUCCESS
npm start         # Test locally
```

---

**Ready to execute!** 🚀
