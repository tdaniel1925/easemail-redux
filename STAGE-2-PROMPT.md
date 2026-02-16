# 🚀 STAGE 2 PROMPT: SEARCH + TESTS

**Copy and paste this entire prompt into your next Claude Code session**

---

## 📋 CONTEXT

You are continuing work on **EaseMail Redux**, a Next.js 14 email application with Supabase backend. In **Stage 1**, you successfully implemented a tabbed inbox interface with:

- ✅ "All" tab (default) - Chronological list via FolderView
- ✅ "Smart Inbox" tab - Categorized sections via SmartInbox
- ✅ URL state persistence (?view=all or ?view=smart)
- ✅ No breaking changes

**Files created in Stage 1:**
- `src/components/inbox/inbox-tabs-view.tsx`

**Files modified in Stage 1:**
- `src/app/(app)/app/inbox/inbox-content.tsx`

---

## 🎯 STAGE 2 OBJECTIVE

Implement **search functionality** and **automated tests** for the inbox tabs feature.

### **What You Need to Build:**

1. **Search Component**
   - Search bar in the PageHeader area
   - Filter messages by: sender (from_email, from_name), subject, or content (body_text)
   - Works across both "All" and "Smart Inbox" tabs
   - Clear search button
   - Real-time filtering (debounced)
   - URL state for search query (?q=search+term)

2. **Vitest Unit Tests**
   - Test InboxTabsView component
   - Test tab switching logic
   - Test URL parameter handling
   - Test default view is "all"

3. **Playwright E2E Tests**
   - Test tab switching updates URL
   - Test URL parameter persists on refresh
   - Test both tabs display messages
   - Test search functionality
   - Test search clears correctly
   - Test mobile responsive tabs

---

## 📚 REQUIRED READING (BEFORE YOU START)

**Read these files in this exact order:**

1. **INBOX-ATOMIC-DEPENDENCY-MAP.md** - Understand architecture and dependencies
2. **INBOX-CHANGES-STAGE1.md** - See what was built in Stage 1
3. **src/components/inbox/inbox-tabs-view.tsx** - Current tab implementation
4. **src/app/(app)/app/inbox/inbox-content.tsx** - How tabs are used
5. **src/components/inbox/smart-inbox.tsx** - How messages are fetched
6. **src/components/inbox/folder-view.tsx** - How "All" view works
7. **PROJECT-SPEC.md** - Project architecture and rules (if it exists)
8. **CLAUDE.md** - Hard rules for this project (if it exists)

---

## 🔧 IMPLEMENTATION TASKS

### **Task 1: Create Search Component**

**File to create:** `src/components/inbox/inbox-search.tsx`

**Requirements:**
- ✅ Input field with search icon (lucide-react)
- ✅ Placeholder: "Search messages..."
- ✅ Debounced input (500ms delay)
- ✅ Clear button (X icon) when search has text
- ✅ Update URL param ?q= when searching
- ✅ Read ?q= param on mount
- ✅ Emit search query to parent component

**Interface:**
```typescript
interface InboxSearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function InboxSearch({ onSearch, initialQuery }: InboxSearchProps) {
  // Implementation
}
```

**Design:**
- Use shadcn Input component
- Use lucide-react icons: Search, X
- Styling: `className="w-full max-w-md"`
- Responsive: Full width on mobile, max-width on desktop

---

### **Task 2: Add Search to InboxTabsView**

**File to modify:** `src/components/inbox/inbox-tabs-view.tsx`

**Changes:**
1. Import InboxSearch component
2. Read ?q= URL parameter
3. Pass search query to FolderView and SmartInbox
4. Update URL when search changes

**Pattern:**
```typescript
const searchQuery = searchParams.get('q') || '';

const handleSearch = (query: string) => {
  const params = new URLSearchParams(searchParams);
  if (query) {
    params.set('q', query);
  } else {
    params.delete('q');
  }
  params.set('view', activeView); // Preserve current tab
  router.push(`${pathname}?${params.toString()}`);
};

return (
  <div>
    <InboxSearch onSearch={handleSearch} initialQuery={searchQuery} />
    <Tabs value={activeView} onValueChange={handleTabChange}>
      {/* Tabs */}
    </Tabs>
  </div>
);
```

---

### **Task 3: Add Search Filtering to FolderView**

**File to modify:** `src/components/inbox/folder-view.tsx`

**Changes:**
1. Add optional `searchQuery` prop
2. Filter messages by search query
3. Search fields: from_email, from_name, subject, body_text
4. Case-insensitive search

**Pattern:**
```typescript
interface FolderViewProps {
  userId: string;
  folderType?: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam' | 'custom';
  folderId?: string;
  searchQuery?: string; // NEW
}

// In fetchMessages():
let query = supabase
  .from('messages')
  .select('*')
  .eq('user_id', userId)
  .eq('email_account_id', selectedAccountId);

if (searchQuery) {
  query = query.or(
    `from_email.ilike.%${searchQuery}%,` +
    `from_name.ilike.%${searchQuery}%,` +
    `subject.ilike.%${searchQuery}%,` +
    `body_text.ilike.%${searchQuery}%`
  );
}
```

---

### **Task 4: Add Search Filtering to SmartInbox**

**File to modify:** `src/components/inbox/smart-inbox.tsx`

**Changes:**
1. Add optional `searchQuery` prop
2. Filter messages in EACH section query
3. Same search fields: from_email, from_name, subject, body_text

**Pattern:**
```typescript
interface SmartInboxProps {
  userId: string;
  searchQuery?: string; // NEW
}

// Apply to EACH query (priority, people, newsletters, etc.)
let priorityQuery = supabase
  .from('messages')
  .select('*')
  .eq('user_id', userId)
  .eq('email_account_id', selectedAccountId)
  .eq('folder_type', 'inbox')
  .in('from_email', priorityEmails);

if (searchQuery) {
  priorityQuery = priorityQuery.or(
    `from_email.ilike.%${searchQuery}%,` +
    `from_name.ilike.%${searchQuery}%,` +
    `subject.ilike.%${searchQuery}%,` +
    `body_text.ilike.%${searchQuery}%`
  );
}

// Repeat for ALL sections: people, newsletters, notifications, promotions, uncategorized
```

---

### **Task 5: Update InboxTabsView to Pass Search Query**

**File to modify:** `src/components/inbox/inbox-tabs-view.tsx`

**Changes:**
Pass searchQuery prop to both FolderView and SmartInbox

**Pattern:**
```typescript
<TabsContent value="all">
  <FolderView userId={userId} folderType="inbox" searchQuery={searchQuery} />
</TabsContent>

<TabsContent value="smart">
  <SmartInbox userId={userId} searchQuery={searchQuery} />
</TabsContent>
```

---

### **Task 6: Create Vitest Unit Tests**

**File to create:** `src/components/inbox/__tests__/inbox-tabs-view.test.tsx`

**Requirements:**
- ✅ Test tab switching
- ✅ Test default view is "all"
- ✅ Test URL parameter handling
- ✅ Test search query updates URL

**Pattern:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { InboxTabsView } from '../inbox-tabs-view';

// Mock Next.js hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(),
}));

describe('InboxTabsView', () => {
  it('renders "All" tab by default', () => {
    // Test implementation
  });

  it('switches tabs when clicked', () => {
    // Test implementation
  });

  it('reads view parameter from URL', () => {
    // Test implementation
  });

  it('updates URL when tab changes', () => {
    // Test implementation
  });

  it('handles search query', () => {
    // Test implementation
  });
});
```

---

### **Task 7: Create Playwright E2E Tests**

**File to create:** `tests/inbox-tabs.spec.ts`

**Requirements:**
- ✅ Test tab switching in browser
- ✅ Test URL updates
- ✅ Test page refresh preserves tab
- ✅ Test search functionality
- ✅ Test mobile responsive tabs

**Pattern:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Inbox Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to inbox
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/inbox');
  });

  test('should default to "All" tab', async ({ page }) => {
    await expect(page).toHaveURL(/view=all/);
    await expect(page.locator('[role="tab"][data-state="active"]')).toHaveText('All');
  });

  test('should switch to Smart Inbox tab', async ({ page }) => {
    await page.click('text=Smart Inbox');
    await expect(page).toHaveURL(/view=smart/);
    await expect(page.locator('[role="tab"][data-state="active"]')).toHaveText('Smart Inbox');
  });

  test('should preserve tab state on refresh', async ({ page }) => {
    await page.click('text=Smart Inbox');
    await page.reload();
    await expect(page).toHaveURL(/view=smart/);
    await expect(page.locator('[role="tab"][data-state="active"]')).toHaveText('Smart Inbox');
  });

  test('should search messages', async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', 'test query');
    await page.waitForTimeout(600); // Wait for debounce
    await expect(page).toHaveURL(/q=test\+query/);
  });

  test('should clear search', async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', 'test');
    await page.click('button[aria-label="Clear search"]');
    await expect(page).not.toHaveURL(/q=/);
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await page.click('text=Smart Inbox');
    await expect(page).toHaveURL(/view=smart/);
  });
});
```

---

### **Task 8: Create Stage 2 Documentation**

**File to create:** `INBOX-CHANGES-STAGE2.md`

**Include:**
- ✅ Summary of what was built
- ✅ Files created and modified
- ✅ How search works
- ✅ Test coverage
- ✅ Known issues (if any)
- ✅ What's next (Stage 3)

---

## ✅ ACCEPTANCE CRITERIA

**Stage 2 is complete when:**

- [ ] Search component created and working
- [ ] Search filters messages in "All" tab
- [ ] Search filters messages in "Smart Inbox" tab
- [ ] Search query updates URL (?q=)
- [ ] Clear search button works
- [ ] Debounced input (no API spam)
- [ ] Vitest tests written and passing
- [ ] Playwright tests written and passing
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] App doesn't crash
- [ ] Mobile responsive search bar
- [ ] INBOX-CHANGES-STAGE2.md created
- [ ] STAGE-3-PROMPT.md generated

---

## 🚨 CRITICAL RULES

**DO NOT:**
- ❌ Modify Stage 1 files beyond adding search props
- ❌ Break existing functionality
- ❌ Remove SmartInbox or FolderView components
- ❌ Change tab UI or behavior (already working)
- ❌ Add features not in this prompt

**DO:**
- ✅ Read all required files before starting
- ✅ Test each change incrementally
- ✅ Run Vitest tests before Playwright tests
- ✅ Check dev server for errors after each change
- ✅ Use existing components (shadcn Input, lucide-react icons)
- ✅ Follow existing code style and patterns
- ✅ Update todo list as you work

---

## 📊 ESTIMATED CONTEXT USAGE

- Reading files: ~15k tokens
- Implementing search: ~20k tokens
- Implementing tests: ~25k tokens
- Documentation: ~10k tokens
- **Total: ~70k tokens** (well within 200k limit)

**You have 149k tokens remaining, Stage 2 will use ~70k, leaving ~79k for Stage 3.**

---

## 🔄 WORKFLOW

Follow this exact order:

1. ✅ Read all required files (see "Required Reading" section)
2. ✅ Create InboxSearch component
3. ✅ Add search to InboxTabsView
4. ✅ Add search filtering to FolderView
5. ✅ Add search filtering to SmartInbox
6. ✅ Test search manually in browser
7. ✅ Create Vitest unit tests
8. ✅ Run Vitest tests (`npm run test`)
9. ✅ Create Playwright e2e tests
10. ✅ Run Playwright tests (`npx playwright test`)
11. ✅ Create INBOX-CHANGES-STAGE2.md
12. ✅ Generate STAGE-3-PROMPT.md
13. ✅ Update todo list to "completed"

---

## 🐛 TROUBLESHOOTING

### **If search doesn't work:**
- Check if searchQuery prop is passed correctly
- Check if URL param is updated
- Check Supabase query syntax (`.or()` vs `.ilike()`)
- Check debounce delay (should be 500ms)

### **If tests fail:**
- Check if mocks are set up correctly
- Check if test environment has access to Next.js hooks
- Run tests in watch mode: `npm run test:watch`
- Check Playwright trace: `npx playwright show-trace`

### **If TypeScript errors:**
- Check if props are typed correctly
- Check if optional props have `?` suffix
- Run `npm run type-check`

---

## 📝 NOTES

- **Search is case-insensitive** - Use `.ilike()` not `.like()`
- **Search is debounced** - Prevents API spam (500ms delay)
- **Search updates URL** - Allows sharing search results
- **Search works in both tabs** - "All" and "Smart Inbox"
- **Tests are required** - Both Vitest and Playwright
- **No breaking changes** - Stage 1 functionality must still work

---

## 🎯 SUCCESS METRICS

After Stage 2, you should have:
- ✅ 3 new files created (search component, 2 test files)
- ✅ 3 files modified (inbox-tabs-view, folder-view, smart-inbox)
- ✅ 5+ unit tests passing
- ✅ 6+ e2e tests passing
- ✅ 0 compilation errors
- ✅ 0 runtime errors
- ✅ Search functionality working
- ✅ All existing functionality preserved

---

**COPY THIS ENTIRE PROMPT INTO YOUR NEXT CLAUDE CODE SESSION**

**Current Status:**
- Stage 1: ✅ COMPLETE
- Stage 2: ⏭️ READY TO START
- Stage 3: ⏭️ PENDING

**Good luck! 🚀**
