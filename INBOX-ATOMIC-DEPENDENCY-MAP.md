# 🗺️ INBOX ATOMIC DEPENDENCY MAP
**Feature:** Tab UI with "All" and "Smart Inbox" Views
**Stage:** 1 of 3
**Date:** February 16, 2026

---

## 📊 CURRENT ARCHITECTURE (Before Changes)

```
┌─────────────────────────────────────────────────────┐
│ page.tsx (Server Component)                         │
│ - Check auth                                        │
│ - Fetch email accounts                              │
│ - Show WelcomeScreen if no accounts                 │
│ - Render InboxContent                               │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ InboxContent (Client Component)                     │
│ - useAccount hook                                   │
│ - useRealtimeSync hook                              │
│ - Check if messages exist                           │
│ - Render PageHeader                                 │
│ - Render RefreshButton                              │
│ - Render RealtimeIndicator                          │
│ - Render SmartInbox (if messages exist)             │
│ - Render EmptyState (if no messages)                │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ SmartInbox (Client Component)                       │
│ - Fetches messages by category                      │
│ - Groups into sections (Priority, People, etc.)     │
│ - Each section collapsible                          │
│ - Renders MessageRow for each message               │
└─────────────────────────────────────────────────────┘
```

---

## 📊 NEW ARCHITECTURE (After Changes)

```
┌─────────────────────────────────────────────────────┐
│ page.tsx (Server Component)                         │
│ - NO CHANGES                                        │
│ - Still renders InboxContent                        │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ InboxContent (Client Component) - MODIFIED          │
│ - Read URL param: ?view=all or ?view=smart         │
│ - Pass view state to InboxTabsView                  │
│ - Render InboxTabsView instead of SmartInbox        │
│ - Keep PageHeader, RefreshButton, etc. (unchanged)  │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ InboxTabsView (NEW Client Component)                │
│ - Render Tabs UI (shadcn)                           │
│ - Handle tab switching                              │
│ - Update URL param on tab change                    │
│ - Default tab: "all"                                │
│                                                     │
│  Tab 1: "All" → FolderView                          │
│  Tab 2: "Smart Inbox" → SmartInbox                  │
└──────────────┬────────────────┬─────────────────────┘
               │                │
               ▼                ▼
┌──────────────────────┐  ┌──────────────────────────┐
│ FolderView           │  │ SmartInbox               │
│ (Existing - Reused)  │  │ (Existing - No Changes)  │
│                      │  │                          │
│ - Shows flat list    │  │ - Shows sections         │
│ - Chronological      │  │ - Collapsible            │
│ - No categories      │  │ - Grouped by category    │
└──────────┬───────────┘  └──────────┬───────────────┘
           │                         │
           └─────────┬───────────────┘
                     ▼
           ┌─────────────────────────┐
           │ MessageRow               │
           │ (Existing - No Changes)  │
           │                          │
           │ - Displays single msg    │
           └──────────────────────────┘
```

---

## 🔄 COMPONENTS: CHANGES MATRIX

| Component | Status | Changes | Impact |
|-----------|--------|---------|--------|
| `page.tsx` | ✅ No Change | None | Zero |
| `inbox-content.tsx` | 🔄 Modified | Add URL param handling, render InboxTabsView | Low |
| `inbox-tabs-view.tsx` | ➕ New | Create new wrapper component | None (new) |
| `smart-inbox.tsx` | ✅ No Change | None | Zero |
| `folder-view.tsx` | ✅ Reused | Use for "All" tab | Zero |
| `message-row.tsx` | ✅ No Change | None | Zero |
| `tabs.tsx` (UI) | ✅ Reused | Use shadcn Tabs | Zero |

---

## 📦 FILE DEPENDENCIES

### **Files to CREATE:**
```
src/components/inbox/inbox-tabs-view.tsx     (NEW)
```

### **Files to MODIFY:**
```
src/app/(app)/app/inbox/inbox-content.tsx    (MODIFY)
```

### **Files to READ (No Changes):**
```
src/components/inbox/smart-inbox.tsx         (REUSE)
src/components/inbox/folder-view.tsx         (REUSE)
src/components/inbox/message-row.tsx         (REUSE)
src/components/ui/tabs.tsx                   (REUSE)
```

---

## 🔗 DEPENDENCY CHAIN

```
inbox-content.tsx (MODIFY)
    ↓ imports
inbox-tabs-view.tsx (NEW)
    ↓ imports
    ├─ tabs.tsx (REUSE)
    ├─ folder-view.tsx (REUSE)
    └─ smart-inbox.tsx (REUSE)
         ↓ imports
       message-row.tsx (REUSE)
```

**Key Insight:** This is a **non-breaking change** because:
1. SmartInbox still exists (no deletion)
2. FolderView already exists (just reused)
3. Only adds a new wrapper (InboxTabsView)
4. Only modifies one file (inbox-content.tsx) to use the wrapper

---

## 🎯 ATOMIC CHANGES BREAKDOWN

### **Change 1: Create InboxTabsView Component**
**File:** `src/components/inbox/inbox-tabs-view.tsx` (NEW)
**Dependencies:**
- Tabs, TabsList, TabsTrigger, TabsContent from `@/components/ui/tabs`
- FolderView from `./folder-view`
- SmartInbox from `./smart-inbox`
- useSearchParams, usePathname, useRouter from `next/navigation`

**Purpose:**
- Render tab UI
- Handle tab switching
- Update URL param
- Render correct view based on active tab

**Breaking Changes:** None (new file)

---

### **Change 2: Update InboxContent Component**
**File:** `src/app/(app)/app/inbox/inbox-content.tsx` (MODIFY)
**Dependencies:** Add import for InboxTabsView

**Changes:**
```typescript
// OLD:
{loading ? (
  <MessageRowSkeleton count={8} />
) : hasMessages ? (
  <SmartInbox userId={userId} />
) : (
  <EmptyState />
)}

// NEW:
{loading ? (
  <MessageRowSkeleton count={8} />
) : hasMessages ? (
  <InboxTabsView userId={userId} />  ← Changed
) : (
  <EmptyState />
)}
```

**Breaking Changes:** None (SmartInbox still rendered, just inside InboxTabsView)

---

## 🧪 IMPACT ANALYSIS

### **Components Affected:**
| Component | Direct Impact | Indirect Impact | Risk |
|-----------|---------------|-----------------|------|
| SmartInbox | None | Still rendered in "Smart Inbox" tab | ✅ Low |
| FolderView | None | Reused for "All" tab | ✅ Low |
| MessageRow | None | Still renders messages | ✅ Low |
| InboxContent | Modified | Renders wrapper instead of direct | ⚠️ Medium |
| page.tsx | None | No changes | ✅ Low |

### **Hooks/Context Used:**
- ✅ useAccount (no changes)
- ✅ useRealtimeSync (no changes)
- ✅ useVacation (no changes)
- ➕ useSearchParams (new - for URL params)
- ➕ usePathname (new - for URL updates)
- ➕ useRouter (new - for navigation)

### **Data Flow:**
```
page.tsx → InboxContent → InboxTabsView → [FolderView | SmartInbox]
                ↓                ↓
           selectedAccountId   userId
                ↓                ↓
           [Passed through to child views]
```

**No data flow changes** - just routing through new wrapper.

---

## 🚨 RISK ASSESSMENT

### **Breaking Change Risk:** ✅ **LOW**
- SmartInbox still works (no deletion)
- FolderView already tested (existing component)
- Only adds a wrapper, doesn't replace functionality

### **Performance Risk:** ✅ **LOW**
- No additional queries (reuses existing)
- No duplicate data fetching
- Lazy loading maintained

### **State Management Risk:** ✅ **LOW**
- URL params for tab state (standard Next.js pattern)
- No new global state
- No context changes

### **Mobile/Responsive Risk:** ⚠️ **MEDIUM**
- Tabs need horizontal scroll on mobile
- Will test in Stage 1
- Shadcn Tabs already responsive

---

## ✅ TESTING STRATEGY

### **Unit Tests (Vitest):**
- InboxTabsView renders correctly
- Tab switching updates URL
- Correct view rendered based on URL param
- Default tab is "all"

### **E2E Tests (Playwright):**
- Navigate to /app/inbox → See "All" tab active
- Click "Smart Inbox" tab → URL updates to ?view=smart
- Click "All" tab → URL updates to ?view=all
- Refresh page → Tab state persists
- Both views display messages correctly

### **Integration Tests:**
- SmartInbox still works inside tab
- FolderView works inside tab
- Real-time sync still works
- Vacation banner still shows
- Refresh button still works

---

## 📋 ROLLBACK PLAN

If something breaks:

**Step 1:** Revert inbox-content.tsx
```typescript
// Change this back:
<InboxTabsView userId={userId} />
// To this:
<SmartInbox userId={userId} />
```

**Step 2:** Delete inbox-tabs-view.tsx (if needed)

**Step 3:** Git revert commit

**Time to rollback:** < 2 minutes
**Risk of rollback:** ✅ Low (single file change)

---

## 🎯 SUCCESS CRITERIA

**Stage 1 is complete when:**
- [ ] InboxTabsView component created
- [ ] "All" tab shows chronological list
- [ ] "Smart Inbox" tab shows sections
- [ ] Tab switching works
- [ ] URL param updates (?view=all or ?view=smart)
- [ ] Default tab is "all"
- [ ] No console errors
- [ ] App doesn't crash
- [ ] Mobile responsive (horizontal scroll)
- [ ] Both views display messages correctly
- [ ] Real-time sync still works
- [ ] Existing functionality unchanged

---

## 📊 DEPENDENCY GRAPH (Visual)

```
                  page.tsx
                      │
                      │ renders
                      ▼
              inbox-content.tsx ◄─── MODIFIED
                      │
                      │ renders (NEW)
                      ▼
            inbox-tabs-view.tsx ◄─── NEW
                      │
        ┌─────────────┴─────────────┐
        │                           │
        │ Tab 1: "All"              │ Tab 2: "Smart Inbox"
        ▼                           ▼
  folder-view.tsx            smart-inbox.tsx
  (REUSE - No Changes)       (REUSE - No Changes)
        │                           │
        └─────────────┬─────────────┘
                      │
                      │ both use
                      ▼
               message-row.tsx
               (REUSE - No Changes)
```

---

## 🔧 IMPLEMENTATION ORDER

1. ✅ Research dependencies (DONE)
2. ✅ Create atomic dependency map (DONE)
3. ⏭️ Create InboxTabsView component
4. ⏭️ Update InboxContent to use InboxTabsView
5. ⏭️ Test tab switching
6. ⏭️ Test URL params
7. ⏭️ Test both views work
8. ⏭️ Test mobile responsive
9. ⏭️ Document changes (INBOX-CHANGES-STAGE1.md)
10. ⏭️ Generate Stage 2 prompt

---

**This map ensures:** Zero breaking changes, low risk, clear rollback path.
