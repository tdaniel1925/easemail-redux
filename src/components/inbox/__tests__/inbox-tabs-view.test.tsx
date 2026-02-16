import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InboxTabsView } from '../inbox-tabs-view';

// Mock Next.js navigation hooks
const mockPush = vi.fn();
let mockSearchParamsData: Record<string, string> = {};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => {
    const params = new URLSearchParams(mockSearchParamsData);
    return params;
  },
  usePathname: () => '/app/inbox',
}));

// Mock child components
vi.mock('../folder-view', () => ({
  FolderView: ({ userId, folderType, searchQuery }: any) => (
    <div data-testid="folder-view">
      FolderView - userId: {userId}, folderType: {folderType}, search: {searchQuery || 'none'}
    </div>
  ),
}));

vi.mock('../smart-inbox', () => ({
  SmartInbox: ({ userId, searchQuery }: any) => (
    <div data-testid="smart-inbox">
      SmartInbox - userId: {userId}, search: {searchQuery || 'none'}
    </div>
  ),
}));

vi.mock('../inbox-search', () => ({
  InboxSearch: ({ onSearch, initialQuery }: any) => (
    <div data-testid="inbox-search">
      <input
        data-testid="search-input"
        type="text"
        defaultValue={initialQuery}
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  ),
}));

describe('InboxTabsView', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParamsData = {};
  });

  it('renders "All" tab by default when no view param', () => {
    render(<InboxTabsView userId="test-user-id" />);

    expect(screen.getByTestId('folder-view')).toBeInTheDocument();
    expect(screen.getByTestId('folder-view')).toBeVisible();
  });

  it('renders "Smart Inbox" tab when view=smart param', () => {
    mockSearchParamsData = { view: 'smart' };

    render(<InboxTabsView userId="test-user-id" />);

    expect(screen.getByTestId('smart-inbox')).toBeVisible();
  });

  // Note: Tab switching tests are covered by Playwright e2e tests
  // Testing Radix UI Tabs component behavior is not necessary in unit tests
  it('has correct tab structure', () => {
    render(<InboxTabsView userId="test-user-id" />);

    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /smart inbox/i })).toBeInTheDocument();
  });

  it('passes search query to child components', () => {
    mockSearchParamsData = { q: 'test search' };

    render(<InboxTabsView userId="test-user-id" />);

    expect(screen.getByTestId('folder-view')).toHaveTextContent('search: test search');
  });

  it('updates URL when search changes', async () => {
    render(<InboxTabsView userId="test-user-id" />);

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'new query' } });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/app/inbox?q=new+query&view=all');
    });
  });

  it('removes search param when search is cleared', async () => {
    mockSearchParamsData = { q: 'existing query' };

    render(<InboxTabsView userId="test-user-id" />);

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/app/inbox?view=all');
    });
  });

  it('passes userId to child components', () => {
    render(<InboxTabsView userId="my-user-id" />);

    expect(screen.getByTestId('folder-view')).toHaveTextContent('userId: my-user-id');
  });

  it('renders both tab triggers', () => {
    render(<InboxTabsView userId="test-user-id" />);

    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /smart inbox/i })).toBeInTheDocument();
  });

  it('renders search component', () => {
    render(<InboxTabsView userId="test-user-id" />);

    expect(screen.getByTestId('inbox-search')).toBeInTheDocument();
  });
});
