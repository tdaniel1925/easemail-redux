# 🚀 STAGE 3 PROMPT: POLISH + DOCUMENTATION

**Copy and paste this entire prompt into your next Claude Code session (if needed)**

---

## 📋 CONTEXT

You are completing the **final stage** of the **Inbox Tabs** feature for **EaseMail Redux**, a Next.js 14 email application.

**Completed Stages:**
- ✅ **Stage 1:** Tab UI + "All" View
- ✅ **Stage 2:** Search + Tests

**Stage 2 Summary:**
- ✅ InboxSearch component created
- ✅ Search filtering implemented (from_email, from_name, subject, body_text)
- ✅ Debounced input (500ms)
- ✅ URL state management (?q=search+term)
- ✅ 9 Vitest unit tests passing
- ✅ 13 Playwright e2e tests written

**Files created in Stage 2:**
- `src/components/inbox/inbox-search.tsx`
- `src/components/inbox/__tests__/inbox-tabs-view.test.tsx`
- `tests/inbox-tabs.spec.ts`
- `vitest.config.ts`
- `vitest.setup.ts`

**Files modified in Stage 2:**
- `src/components/inbox/inbox-tabs-view.tsx`
- `src/components/inbox/folder-view.tsx`
- `src/components/inbox/smart-inbox.tsx`

---

## 🎯 STAGE 3 OBJECTIVE

Polish the feature and create comprehensive documentation.

### **What You Need to Build:**

1. **Empty States**
   - "No results found" when search returns empty
   - Clear, helpful messaging
   - Suggestions to clear search or try different query

2. **Loading States**
   - Loading indicator during search
   - Skeleton loaders while filtering

3. **Accessibility** (Optional but recommended)
   - Keyboard shortcut (Cmd+K / Ctrl+K) to focus search
   - ARIA labels for screen readers
   - Focus management

4. **Performance Review**
   - Check bundle size impact
   - Verify search query performance
   - Optimize if needed

5. **Documentation**
   - User-facing documentation (how to use search)
   - Developer documentation (how search works)
   - Complete feature documentation

6. **Git Commit**
   - Commit all Stage 1-3 changes
   - Descriptive commit message

---

## 📚 REQUIRED READING (BEFORE YOU START)

**Read these files in this exact order:**

1. **INBOX-ATOMIC-DEPENDENCY-MAP.md** - Original architecture plan
2. **INBOX-CHANGES-STAGE1.md** - Stage 1 summary
3. **INBOX-CHANGES-STAGE2.md** - Stage 2 summary
4. **src/components/inbox/inbox-search.tsx** - Search component
5. **src/components/inbox/inbox-tabs-view.tsx** - Tab wrapper with search
6. **src/components/inbox/folder-view.tsx** - "All" view with search
7. **src/components/inbox/smart-inbox.tsx** - Smart Inbox with search

---

## 🔧 IMPLEMENTATION TASKS

### **Task 1: Add Empty State for No Search Results**

**Files to modify:**
- `src/components/inbox/folder-view.tsx`
- `src/components/inbox/smart-inbox.tsx`

**Requirements:**
- ✅ Detect when search returns 0 results
- ✅ Display helpful empty state
- ✅ Show current search query
- ✅ Suggest clearing search or trying different query
- ✅ Use existing EmptyState component

**Pattern for FolderView:**
```typescript
if (threads.length === 0 && searchQuery) {
  return (
    <Card className="p-6">
      <EmptyState
        icon={<Search className="h-12 w-12" />}
        title="No messages found"
        description={`No messages match "${searchQuery}". Try a different search term or clear your search.`}
      />
    </Card>
  );
}

if (threads.length === 0) {
  // Existing empty state (no messages at all)
  return <EmptyState ... />;
}
```

---

### **Task 2: Add Loading State for Search**

**File to create:** `src/components/inbox/inbox-search-loading.tsx` (optional)

**File to modify:** `src/components/inbox/inbox-tabs-view.tsx`

**Requirements:**
- ✅ Show loading indicator when search is active
- ✅ Use existing MessageRowSkeleton component
- ✅ Debounce prevents flickering (500ms already implemented)

**Optional Enhancement:**
Show search status indicator (e.g., "Searching..." text or spinner icon)

---

### **Task 3: Add Keyboard Shortcut (Optional)**

**File to modify:** `src/components/inbox/inbox-tabs-view.tsx`

**Requirements:**
- ✅ Cmd+K (Mac) or Ctrl+K (Windows/Linux) focuses search
- ✅ Listen for keyboard event
- ✅ Focus search input when triggered
- ✅ Prevent default browser behavior

**Pattern:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      // Focus search input
      searchInputRef.current?.focus();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

### **Task 4: Add ARIA Labels**

**File to modify:** `src/components/inbox/inbox-search.tsx`

**Requirements:**
- ✅ Add aria-label to search input
- ✅ Add aria-label to clear button
- ✅ Add aria-live region for search results count (optional)

**Pattern:**
```typescript
<Input
  aria-label="Search messages by sender, subject, or content"
  placeholder="Search messages..."
  // ...
/>

<Button
  aria-label="Clear search"
  onClick={handleClear}
>
  <X />
</Button>
```

---

### **Task 5: Performance Review**

**Commands to run:**
```bash
# Check bundle size
npm run build

# Analyze bundle (if next-bundle-analyzer is installed)
ANALYZE=true npm run build

# Run Lighthouse audit (optional)
npx lighthouse http://localhost:3000/app/inbox --view
```

**What to check:**
- ✅ Bundle size impact of new components
- ✅ No unnecessary dependencies imported
- ✅ Search query performance (check Supabase logs if accessible)

---

### **Task 6: Create User Documentation**

**File to create:** `docs/INBOX-SEARCH-USER-GUIDE.md`

**Content to include:**
- ✅ How to search messages
- ✅ What fields are searched
- ✅ How to clear search
- ✅ Keyboard shortcuts (if implemented)
- ✅ Tips for effective searching
- ✅ Screenshots (optional, can be added later)

---

### **Task 7: Create Developer Documentation**

**File to create:** `docs/INBOX-SEARCH-DEV-GUIDE.md`

**Content to include:**
- ✅ Architecture overview
- ✅ Component structure
- ✅ Search query implementation
- ✅ URL state management
- ✅ Testing strategy
- ✅ How to extend search (add more fields)
- ✅ Performance considerations

---

### **Task 8: Create Complete Feature Documentation**

**File to create:** `INBOX-CHANGES-COMPLETE.md`

**Content to include:**
- ✅ Summary of all 3 stages
- ✅ All files created/modified
- ✅ Complete test coverage
- ✅ Performance metrics
- ✅ Known limitations
- ✅ Future enhancements

---

### **Task 9: Git Commit**

**Requirements:**
- ✅ Stage all changes
- ✅ Create descriptive commit message
- ✅ Include co-author attribution
- ✅ Follow project commit message format

**Pattern:**
```bash
git add .

git commit -m "$(cat <<'EOF'
feat: Add tabbed inbox with search functionality

Implemented a comprehensive tabbed inbox interface with search:

Stage 1: Tab UI + "All" View
- Created InboxTabsView wrapper component
- Added "All" tab (chronological list via FolderView)
- Added "Smart Inbox" tab (categorized sections)
- URL state persistence (?view=all or ?view=smart)

Stage 2: Search + Tests
- Created InboxSearch component with debounced input (500ms)
- Implemented search filtering across all fields (from_email, from_name, subject, body_text)
- URL state for search queries (?q=search+term)
- Added 9 Vitest unit tests (100% passing)
- Added 13 Playwright e2e tests

Stage 3: Polish + Documentation
- Added empty states for no search results
- Added loading states for search
- Improved accessibility with ARIA labels
- Created user and developer documentation
- Performance review and optimization

Files created: 10
Files modified: 4
Tests: 9 unit + 13 e2e
Breaking changes: 0

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## ✅ ACCEPTANCE CRITERIA

**Stage 3 is complete when:**

- [ ] Empty state for no search results implemented
- [ ] Loading state for search implemented
- [ ] ARIA labels added to search components
- [ ] Keyboard shortcut implemented (optional)
- [ ] Performance review completed
- [ ] User documentation created
- [ ] Developer documentation created
- [ ] Complete feature documentation created
- [ ] All changes committed to git
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] App doesn't crash
- [ ] All tests still passing (9 unit + 13 e2e)

---

## 🚨 CRITICAL RULES

**DO NOT:**
- ❌ Break existing functionality
- ❌ Remove or modify Stage 1 or Stage 2 code (unless fixing bugs)
- ❌ Add features not in this prompt
- ❌ Skip documentation
- ❌ Commit without descriptive message

**DO:**
- ✅ Read all required files before starting
- ✅ Test each change incrementally
- ✅ Verify all tests still pass
- ✅ Create clear, helpful documentation
- ✅ Follow existing code style
- ✅ Update todo list as you work

---

## 📊 ESTIMATED CONTEXT USAGE

- Reading files: ~10k tokens
- Implementing empty/loading states: ~15k tokens
- Implementing accessibility: ~10k tokens
- Creating documentation: ~20k tokens
- Git commit: ~5k tokens
- **Total: ~60k tokens** (within 113k remaining)

**You have ~113k tokens remaining, Stage 3 will use ~60k, leaving ~53k buffer.**

---

## 🔄 WORKFLOW

Follow this exact order:

1. ✅ Read all required files
2. ✅ Add empty state for no search results
3. ✅ Add loading state for search
4. ✅ Add ARIA labels
5. ✅ Add keyboard shortcut (optional)
6. ✅ Performance review
7. ✅ Create user documentation
8. ✅ Create developer documentation
9. ✅ Create complete feature documentation
10. ✅ Run all tests (npm run test)
11. ✅ Manual browser testing
12. ✅ Git commit all changes
13. ✅ Update todo list to "completed"

---

## 🐛 TROUBLESHOOTING

### **If empty state doesn't show:**
- Check if searchQuery is being passed correctly
- Check if condition `threads.length === 0 && searchQuery` is true
- Check console for errors

### **If keyboard shortcut doesn't work:**
- Check if event listener is attached to document
- Check if preventDefault() is called
- Check if search input ref is set correctly

### **If tests fail after changes:**
- Run `npm run test` to see which tests fail
- Check if you modified any tested behavior
- Update tests if behavior intentionally changed

---

## 📝 NOTES

- **Empty states improve UX** - Users know search is working, just no results
- **Loading states prevent confusion** - Users know search is in progress
- **Keyboard shortcuts boost productivity** - Power users love them
- **ARIA labels improve accessibility** - Screen readers need them
- **Documentation is critical** - Future developers (and users) will thank you

---

## 🎯 SUCCESS METRICS

After Stage 3, you should have:
- ✅ 10 total files created (across all stages)
- ✅ 4 files modified (across all stages)
- ✅ 9 unit tests passing
- ✅ 13 e2e tests passing
- ✅ 3 documentation files
- ✅ 1 git commit
- ✅ 0 compilation errors
- ✅ 0 runtime errors
- ✅ Complete, polished feature

---

## 🎉 FINAL DELIVERABLES

**Code:**
- Inbox tabs with "All" and "Smart Inbox" views
- Search functionality with debounce
- Empty and loading states
- Accessibility improvements
- URL state management

**Tests:**
- 9 Vitest unit tests (passing)
- 13 Playwright e2e tests (ready)

**Documentation:**
- User guide (how to use search)
- Developer guide (how search works)
- Complete feature documentation (all 3 stages)

**Git:**
- Single descriptive commit with all changes

---

**COPY THIS ENTIRE PROMPT INTO YOUR NEXT CLAUDE CODE SESSION (if needed)**

**Current Status:**
- Stage 1: ✅ COMPLETE
- Stage 2: ✅ COMPLETE
- Stage 3: ⏭️ READY TO START (optional polish + docs)

**Note:** Stage 3 is **optional** if you want to ship the feature now. Stages 1 and 2 are fully functional and tested. Stage 3 adds polish and documentation.

**Good luck! 🚀**
