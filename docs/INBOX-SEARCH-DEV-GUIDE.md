# 🔧 Inbox Search - Developer Guide

**Last Updated:** February 16, 2026

---

## 🏗️ Architecture Overview

The inbox search feature is built on top of the tabbed inbox interface and provides real-time, server-side filtering of email messages.

### **Component Hierarchy:**

```
page.tsx (Server Component)
    ↓
InboxContent (Client Component)
    ↓
InboxTabsView (Client Component)
    ├─ InboxSearch (NEW - Client Component)
    └─ Tabs
        ├─ "All" → FolderView (with searchQuery prop)
        └─ "Smart Inbox" → SmartInbox (with searchQuery prop)
```

---

## 📦 Component Structure

### **1. InboxSearch Component**

**File:** `src/components/inbox/inbox-search.tsx`

**Purpose:** Debounced search input with clear button

**Key Features:**
- Controlled input component
- 500ms debounce delay
- Clear button (X icon)
- Exposes `focus()` method via ref
- ARIA labels for accessibility

**Props:**
```typescript
interface InboxSearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

interface InboxSearchRef {
  focus: () => void;
}
```

**Usage:**
```typescript
const searchRef = useRef<InboxSearchRef>(null);

<InboxSearch
  ref={searchRef}
  onSearch={handleSearch}
  initialQuery={searchQuery}
/>
```

---

### **2. InboxTabsView Component**

**File:** `src/components/inbox/inbox-tabs-view.tsx`

**Purpose:** Wrapper that manages tabs and search state

**Key Responsibilities:**
- Read/write URL search params (?q=, ?view=)
- Handle keyboard shortcuts (Cmd+K / Ctrl+K)
- Pass searchQuery to child components
- Preserve search when switching tabs

**State Management:**
```typescript
const searchQuery = searchParams.get('q') || '';
const activeView = searchParams.get('view') || 'all';

const handleSearch = (query: string) => {
  const params = new URLSearchParams(searchParams);
  if (query) {
    params.set('q', query);
  } else {
    params.delete('q');
  }
  params.set('view', activeView); // Preserve tab
  router.push(`${pathname}?${params.toString()}`);
};
```

---

### **3. FolderView Component**

**File:** `src/components/inbox/folder-view.tsx`

**Purpose:** Display chronological list of messages (used in "All" tab)

**Search Integration:**
```typescript
interface FolderViewProps {
  userId: string;
  folderType?: 'inbox' | 'sent' | 'drafts' | ...;
  folderId?: string;
  searchQuery?: string; // NEW
}

// In fetchMessages():
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

### **4. SmartInbox Component**

**File:** `src/components/inbox/smart-inbox.tsx`

**Purpose:** Display categorized sections (used in "Smart Inbox" tab)

**Search Integration:**
- Same `.or()` filter applied to **ALL 6 section queries**:
  1. Priority messages
  2. People messages
  3. Newsletters
  4. Notifications
  5. Promotions
  6. Uncategorized

**Pattern:**
```typescript
// Applied to EACH query
if (searchQuery) {
  priorityQuery = priorityQuery.or(
    `from_email.ilike.%${searchQuery}%,` +
    `from_name.ilike.%${searchQuery}%,` +
    `subject.ilike.%${searchQuery}%,` +
    `body_text.ilike.%${searchQuery}%`
  );
}
```

---

## 🔄 Data Flow

### **Search Execution Flow:**

```
1. User types in search box
   ↓
2. Debounce timer starts (500ms)
   ↓
3. Timer completes → onSearch() callback fires
   ↓
4. InboxTabsView.handleSearch() updates URL
   ↓
5. Router navigates with new params (?q=search+term)
   ↓
6. Component re-renders with new searchParams
   ↓
7. searchQuery extracted from URL
   ↓
8. searchQuery passed to FolderView/SmartInbox
   ↓
9. Component refetches messages with search filter
   ↓
10. Supabase executes .or() query with .ilike operators
    ↓
11. Filtered messages returned and displayed
```

---

## 🗄️ Database Query

### **Supabase Filter:**

```typescript
query.or(
  `from_email.ilike.%${searchQuery}%,` +
  `from_name.ilike.%${searchQuery}%,` +
  `subject.ilike.%${searchQuery}%,` +
  `body_text.ilike.%${searchQuery}%`
)
```

**Translates to SQL:**
```sql
WHERE (
  from_email ILIKE '%searchQuery%' OR
  from_name ILIKE '%searchQuery%' OR
  subject ILIKE '%searchQuery%' OR
  body_text ILIKE '%searchQuery%'
)
```

**Notes:**
- `.ilike` = case-insensitive pattern match (Postgres-specific)
- `%` = wildcard (matches any characters)
- Server-side filtering (not client-side)
- Indexed fields for performance

---

## 🎨 UI/UX Patterns

### **Debounce Implementation:**

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    onSearch(searchValue);
  }, 500);

  return () => clearTimeout(timer);
}, [searchValue, onSearch]);
```

**Why 500ms?**
- Prevents API spam while user is typing
- Balances responsiveness vs performance
- Standard UX pattern for search inputs

---

### **URL State Management:**

**Reading URL Params:**
```typescript
const searchParams = useSearchParams();
const searchQuery = searchParams.get('q') || '';
const activeView = searchParams.get('view') || 'all';
```

**Writing URL Params:**
```typescript
const params = new URLSearchParams(searchParams);
params.set('q', query);
params.set('view', activeView);
router.push(`${pathname}?${params.toString()}`);
```

**Benefits:**
- Shareable search results
- Browser back/forward support
- Bookmark searches
- Deep linking

---

### **Keyboard Shortcut:**

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchRef.current?.focus();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Notes:**
- `metaKey` = Cmd on Mac
- `ctrlKey` = Ctrl on Windows/Linux
- `preventDefault()` stops browser default behavior
- Event listener cleaned up on unmount

---

## 🧪 Testing Strategy

### **Unit Tests (Vitest):**

**File:** `src/components/inbox/__tests__/inbox-tabs-view.test.tsx`

**Coverage:**
- Component rendering
- Search query prop passing
- URL parameter handling
- Default view behavior

**Example:**
```typescript
it('passes search query to child components', () => {
  mockSearchParamsData = { q: 'test search' };
  render(<InboxTabsView userId="test-user-id" />);
  expect(screen.getByTestId('folder-view')).toHaveTextContent('search: test search');
});
```

---

### **E2E Tests (Playwright):**

**File:** `tests/inbox-tabs.spec.ts`

**Coverage:**
- Search functionality in browser
- URL updates
- Tab switching with search
- Mobile responsive
- Browser navigation

**Example:**
```typescript
test('should update URL when searching', async ({ page }) => {
  const searchInput = page.locator('input[placeholder*="Search"]');
  await searchInput.fill('test query');
  await page.waitForTimeout(600); // Wait for debounce
  expect(page.url()).toContain('q=test');
});
```

---

## ⚡ Performance Considerations

### **Optimizations:**

1. **Debounced Input (500ms)**
   - Reduces API calls
   - Waits for user to finish typing
   - Prevents unnecessary re-renders

2. **Server-Side Filtering**
   - Supabase handles filtering
   - Not filtering in React (client-side)
   - Reduces payload size

3. **Indexed Database Fields**
   - `from_email`, `from_name`, `subject`, `body_text` should be indexed
   - Improves query performance
   - Fast partial string matching

4. **Query Limit**
   - FolderView limits to 200 messages
   - SmartInbox limits each section (20-50 messages)
   - Prevents large payloads

---

### **Performance Metrics:**

From `npm run build`:
```
Route (app)                    Size     First Load JS
├ ƒ /app/inbox                 10.9 kB         299 kB
```

**Impact of Search Feature:**
- Bundle size increase: ~2 kB (InboxSearch component)
- No additional dependencies
- Negligible performance impact

---

## 🔧 How to Extend Search

### **Adding New Search Fields:**

To search additional fields (e.g., `cc`, `bcc`):

**1. Update FolderView query:**
```typescript
if (searchQuery) {
  query = query.or(
    `from_email.ilike.%${searchQuery}%,` +
    `from_name.ilike.%${searchQuery}%,` +
    `subject.ilike.%${searchQuery}%,` +
    `body_text.ilike.%${searchQuery}%,` +
    `cc.ilike.%${searchQuery}%,` +           // NEW
    `bcc.ilike.%${searchQuery}%`             // NEW
  );
}
```

**2. Update SmartInbox queries:**
- Apply same pattern to ALL 6 section queries

**3. Update database indexes:**
```sql
CREATE INDEX idx_messages_cc ON messages USING gin (cc gin_trgm_ops);
CREATE INDEX idx_messages_bcc ON messages USING gin (bcc gin_trgm_ops);
```

**4. Update tests:**
- Add test cases for new fields
- Update documentation

---

### **Advanced Search Syntax:**

To support operators like `from:john` or `subject:invoice`:

**1. Parse query in handleSearch:**
```typescript
const parseQuery = (query: string) => {
  const operators = {
    'from:': 'from_email',
    'to:': 'to_email',
    'subject:': 'subject',
  };

  // Parse and extract operators
  // Return structured query object
};
```

**2. Build dynamic query:**
```typescript
const parsedQuery = parseQuery(searchQuery);
if (parsedQuery.from) {
  query = query.ilike('from_email', `%${parsedQuery.from}%`);
}
if (parsedQuery.subject) {
  query = query.ilike('subject', `%${parsedQuery.subject}%`);
}
```

---

## 🐛 Debugging

### **Common Issues:**

**Search returns no results:**
- Check Supabase query in DevTools Network tab
- Verify searchQuery prop is passed correctly
- Check database has messages matching query
- Verify `.ilike` operator is supported (Postgres only)

**Search is slow:**
- Check database indexes exist
- Reduce query limit
- Check network latency
- Profile Supabase query performance

**URL params not updating:**
- Check `useRouter()` is from `next/navigation` (not `next/router`)
- Verify `router.push()` is called
- Check browser console for errors

---

### **Debugging Tools:**

**React DevTools:**
```
Components → InboxTabsView
Props → searchQuery: "test"
```

**Supabase Dashboard:**
```
Table Editor → messages
SQL Editor → Test query manually
```

**Chrome DevTools Network:**
```
Filter: postgrest
Check request body for search filters
```

---

## 📚 References

### **Related Files:**
- `src/components/inbox/inbox-search.tsx`
- `src/components/inbox/inbox-tabs-view.tsx`
- `src/components/inbox/folder-view.tsx`
- `src/components/inbox/smart-inbox.tsx`

### **Documentation:**
- [User Guide](./INBOX-SEARCH-USER-GUIDE.md)
- [Complete Feature Docs](../INBOX-CHANGES-COMPLETE.md)

### **External Resources:**
- [Supabase Filters](https://supabase.com/docs/reference/javascript/filter)
- [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [React forwardRef](https://react.dev/reference/react/forwardRef)

---

## 🚀 Deployment Checklist

Before deploying search to production:

- [ ] Run all tests (`npm run test`)
- [ ] Run build (`npm run build`)
- [ ] Verify bundle size is acceptable
- [ ] Test on staging environment
- [ ] Test search with real data
- [ ] Test search on mobile devices
- [ ] Verify database indexes exist
- [ ] Check Supabase query performance
- [ ] Update user documentation
- [ ] Train support team

---

**Built with ❤️ using Next.js 14, Supabase, and shadcn/ui**
