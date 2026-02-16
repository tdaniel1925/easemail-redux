# 📧 Inbox Search - User Guide

**Last Updated:** February 16, 2026

---

## 🎯 Overview

The Inbox Search feature allows you to quickly find messages across all your email accounts by searching through sender names, email addresses, subjects, and message content.

---

## 🔍 How to Search Messages

### **Basic Search:**

1. Navigate to your **Inbox** page
2. Look for the **search bar** at the top of the message list
3. Type your search query (e.g., "meeting", "john@example.com", "invoice")
4. Wait 0.5 seconds - results will automatically appear as you type

### **What Can You Search?**

Search looks through these fields:
- **Sender Email** - The email address of who sent the message
- **Sender Name** - The display name of the sender
- **Subject Line** - The message subject
- **Message Content** - The body text of the email

**Example Searches:**
- `john` - Finds messages from John or about John
- `invoice` - Finds all invoices in subject or content
- `project alpha` - Finds messages mentioning "project alpha"
- `@company.com` - Finds all messages from company.com domain

---

## ⌨️ Keyboard Shortcuts

### **Quick Search:**

Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux) from anywhere in the inbox to instantly focus the search bar.

**Steps:**
1. Press **Cmd+K** or **Ctrl+K**
2. Search bar becomes focused automatically
3. Start typing your query

---

## 🧹 Clearing Your Search

### **Method 1: Clear Button**

Click the **X button** that appears on the right side of the search bar when you have text entered.

### **Method 2: Delete All Text**

Simply delete all text from the search box - this will show all messages again.

### **Method 3: Keyboard Shortcut**

1. Press **Cmd+K** or **Ctrl+K** to focus search
2. Press **Cmd+A** or **Ctrl+A** to select all
3. Press **Delete** or **Backspace**

---

## 📋 Search Tips

### **Best Practices:**

✅ **Be Specific** - Use unique keywords for better results
- Good: `Q1 2024 sales report`
- Less Good: `report`

✅ **Use Names** - Search by sender name for personal messages
- Example: `Sarah Thompson`

✅ **Search Domains** - Find all messages from a company
- Example: `@microsoft.com`

✅ **Combine Keywords** - Use multiple words for precision
- Example: `invoice january 2024`

### **What to Know:**

- **Search is case-insensitive** - "INVOICE" and "invoice" give same results
- **Search is partial match** - "john" finds "John", "Johnson", "johnny"
- **Search works across ALL tabs** - Results shown in both "All" and "Smart Inbox" views
- **Search updates the URL** - You can bookmark or share search results
- **Search is debounced** - Wait 0.5 seconds after typing for results

---

## 🔄 Search Across Tabs

Search works in both inbox views:

### **"All" Tab:**
Shows search results in chronological order (newest first)

### **Smart Inbox" Tab:**
Shows search results organized by categories:
- Priority
- People
- Newsletters
- Notifications
- Promotions

**Tip:** Switch between tabs while searching to see results organized differently!

---

## ❓ No Results Found

If you see **"No messages found"**:

1. **Check your spelling** - Try alternative spellings
2. **Try broader keywords** - Search for `john` instead of `john@company.com`
3. **Check the date range** - Older messages may be archived
4. **Clear your search** - Click the X button and try again
5. **Try searching in other folders** - Check Sent, Archive, or Trash

---

## 🎨 Visual Guide

### **Empty Search Bar:**
```
┌─────────────────────────────────────────────┐
│  🔍  Search messages...                      │
└─────────────────────────────────────────────┘
```

### **Active Search:**
```
┌─────────────────────────────────────────────┐
│  🔍  meeting tomorrow                     ✖️ │
└─────────────────────────────────────────────┘
```
(X button appears when typing)

### **No Results:**
```
┌──────────────────────────────────────────────┐
│                                              │
│              📭                              │
│                                              │
│         No messages found                    │
│                                              │
│  No messages match "xyz". Try a different    │
│  search term or clear your search.           │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 🚀 Advanced Features

### **URL State:**

When you search, the URL updates to include your query:
```
/app/inbox?q=meeting+tomorrow&view=all
```

**Benefits:**
- **Bookmark searches** - Save frequent searches
- **Share search results** - Send link to colleagues
- **Browser history** - Use back/forward buttons

### **Search Persistence:**

Your search query is preserved when:
- Switching between "All" and "Smart Inbox" tabs
- Refreshing the page
- Navigating back/forward in browser history

---

## 🐛 Troubleshooting

### **Search Not Working?**

1. **Check your connection** - Ensure you're online
2. **Refresh the page** - Press F5 or Cmd+R
3. **Clear browser cache** - Hard refresh with Ctrl+Shift+R
4. **Try a different browser** - Test in Chrome, Firefox, or Safari

### **Search is Slow?**

- **Wait for debounce** - Search starts 0.5 seconds after you stop typing
- **Check your internet** - Slow connection may delay results
- **Reduce query complexity** - Try shorter search terms

### **Getting Too Many Results?**

- **Be more specific** - Add more keywords
- **Use quotes** - Search for exact phrases (e.g., "project alpha")
- **Include sender** - Add sender name or email to filter

---

## 💡 Pro Tips

1. **Use Cmd+K repeatedly** - Quick way to clear and restart search
2. **Search in "Smart Inbox"** - See categorized results
3. **Bookmark frequent searches** - Save time on daily searches
4. **Combine with filters** - Use tabs to organize search results

---

## 📱 Mobile Usage

Search works on mobile devices:
- Tap the search bar to open keyboard
- Type your query
- Tap the X to clear
- Swipe between tabs to see different views

**Note:** Keyboard shortcut (Cmd+K) not available on mobile devices.

---

## 🆘 Need Help?

If you're having trouble with search:
- Check the [Developer Guide](./INBOX-SEARCH-DEV-GUIDE.md) for technical details
- Report issues on GitHub: [github.com/your-org/easemail/issues](https://github.com/anthropics/claude-code/issues)
- Contact support: support@easemail.app

---

**Happy Searching! 🎉**
