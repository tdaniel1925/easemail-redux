/**
 * Provider Adapter Types
 * Unified interface for email providers (Microsoft Graph, Gmail)
 */

export type ProviderType = 'GOOGLE' | 'MICROSOFT';

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface NormalizedMessage {
  provider_message_id: string;
  provider_thread_id: string | null;
  subject: string | null;
  from_email: string;
  from_name: string | null;
  to_recipients: { email: string; name?: string | null }[];
  cc_recipients: { email: string; name?: string | null }[];
  bcc_recipients: { email: string; name?: string | null }[];
  reply_to: { email: string; name?: string | null }[];
  body_html: string | null;
  body_text: string | null;
  snippet: string | null;
  folder_id: string; // provider's native folder/label ID
  folder_type: FolderType;
  is_unread: boolean;
  is_starred: boolean;
  is_draft: boolean;
  has_attachments: boolean;
  attachments: {
    id: string;
    name: string;
    size: number;
    type: string;
    content_id?: string | null;
  }[];
  importance: 'low' | 'normal' | 'high';
  message_date: string; // ISO 8601
}

export type FolderType =
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'trash'
  | 'spam'
  | 'archive'
  | 'starred'
  | 'important'
  | 'snoozed'
  | 'custom';

export interface Folder {
  id: string;
  name: string;
  folder_type: FolderType;
  is_system_folder: boolean;
  unread_count: number;
  total_count: number;
}

export interface Contact {
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
}

export interface CalendarMetadata {
  id: string;
  name: string;
  description: string | null;
  timezone: string;
  is_primary: boolean;
  read_only: boolean;
  color: string | null;
}

export interface CalendarEvent {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  all_day: boolean;
  timezone: string;
  recurrence: unknown | null; // provider-specific recurrence rule
  attendees: { email: string; name?: string | null; status?: string }[];
  organizer_email: string | null;
  is_online_meeting: boolean;
  meeting_url: string | null;
  meeting_provider: string | null;
  reminders: { minutes_before: number; method: string }[];
  color: string | null;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface SyncChange {
  type: 'created' | 'updated' | 'deleted';
  message?: NormalizedMessage;
  message_id?: string; // for deletions
}

export interface ListOptions {
  folder_id?: string;
  limit?: number;
  cursor?: string;
  filter?: string;
}

export interface EventListOptions {
  start_date?: string; // ISO 8601
  end_date?: string; // ISO 8601
  limit?: number;
  cursor?: string;
}

export interface SendMessageParams {
  to: { email: string; name?: string | null }[];
  cc?: { email: string; name?: string | null }[];
  bcc?: { email: string; name?: string | null }[];
  subject: string;
  body_html: string;
  body_text?: string | null;
  attachments?: {
    name: string;
    content: Buffer | string; // base64
    content_type: string;
  }[];
  reply_to_message_id?: string;
}

export interface ReplyParams {
  body_html: string;
  body_text?: string | null;
  to_all?: boolean; // reply all vs reply
}

export interface ForwardParams {
  to: { email: string; name?: string | null }[];
  body_html: string;
  body_text?: string | null;
  comment?: string;
}

export interface MessageUpdates {
  is_read?: boolean;
  is_starred?: boolean;
  folder_id?: string;
}

export interface DraftParams {
  to?: { email: string; name?: string | null }[];
  cc?: { email: string; name?: string | null }[];
  bcc?: { email: string; name?: string | null }[];
  subject?: string;
  body_html?: string;
  body_text?: string | null;
  attachments?: {
    name: string;
    content: Buffer | string;
    content_type: string;
  }[];
}

export interface AttachmentData {
  id: string;
  name: string;
  content: Buffer;
  content_type: string;
  size: number;
}

export interface CreateEventParams {
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601;
  all_day?: boolean;
  timezone?: string;
  attendees?: { email: string; name?: string | null }[];
  is_online_meeting?: boolean;
  reminders?: { minutes_before: number; method: string }[];
}

export interface UpdateEventParams extends Partial<CreateEventParams> {
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface TeamsMeeting {
  id: string;
  join_url: string;
  title: string;
  start_time: string;
  end_time: string;
}

export interface MeetingDetails {
  subject: string;
  start_time: string;
  end_time: string;
  attendees?: { email: string }[];
}

/**
 * Unified email provider interface
 * Implemented by MicrosoftProvider and GoogleProvider
 */
export interface EmailProvider {
  // OAuth & Authentication
  getAuthUrl(redirectUri: string, state: string, codeChallenge: string): Promise<string>;
  exchangeCode(
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<TokenSet>;
  refreshToken(refreshToken: string): Promise<TokenSet>;

  // Messages
  listMessages(
    token: string,
    options?: ListOptions
  ): Promise<{ messages: NormalizedMessage[]; cursor?: string }>;
  getMessage(token: string, messageId: string): Promise<NormalizedMessage>;
  sendMessage(token: string, message: SendMessageParams): Promise<{ id: string }>;
  replyToMessage(
    token: string,
    messageId: string,
    reply: ReplyParams
  ): Promise<{ id: string }>;
  forwardMessage(
    token: string,
    messageId: string,
    forward: ForwardParams
  ): Promise<{ id: string }>;
  moveMessage(token: string, messageId: string, folderId: string): Promise<void>;
  deleteMessage(token: string, messageId: string): Promise<void>;
  updateMessage(
    token: string,
    messageId: string,
    updates: MessageUpdates
  ): Promise<void>;

  // Folders & Labels
  listFolders(token: string): Promise<Folder[]>;
  createFolder(token: string, name: string): Promise<Folder>;

  // Drafts
  createDraft(token: string, draft: DraftParams): Promise<{ id: string }>;
  updateDraft(token: string, draftId: string, draft: DraftParams): Promise<void>;
  deleteDraft(token: string, draftId: string): Promise<void>;

  // Attachments
  getAttachment(
    token: string,
    messageId: string,
    attachmentId: string
  ): Promise<AttachmentData>;

  // Sync
  deltaSync(token: string, cursor?: string): Promise<{
    changes: SyncChange[];
    newCursor: string;
  }>;

  // Calendar
  listCalendars(token: string): Promise<CalendarMetadata[]>;
  listEvents(
    token: string,
    calendarId: string,
    options?: EventListOptions
  ): Promise<{ events: CalendarEvent[]; cursor?: string }>;
  createEvent(
    token: string,
    calendarId: string,
    event: CreateEventParams
  ): Promise<CalendarEvent>;
  updateEvent(
    token: string,
    calendarId: string,
    eventId: string,
    event: UpdateEventParams
  ): Promise<CalendarEvent>;
  deleteEvent(token: string, calendarId: string, eventId: string): Promise<void>;
  deltaSyncEvents(
    token: string,
    calendarId: string,
    cursor?: string
  ): Promise<{ changes: SyncChange[]; newCursor: string }>;

  // Contacts
  listContacts(token: string, options: { limit: number }): Promise<Contact[]>;

  // Teams (Microsoft only - optional)
  getUpcomingMeetings?(token: string, daysAhead: number): Promise<TeamsMeeting[]>;
  createTeamsMeeting?(
    token: string,
    details: MeetingDetails
  ): Promise<TeamsMeeting>;

  // Webhooks / Push Notifications
  // Note: Parameters and return types differ between providers
  // Google uses Pub/Sub topics, Microsoft uses webhook URLs with client state
  createSubscription(
    token: string,
    webhookUrlOrTopic: string,
    clientState?: string
  ): Promise<any>;
  renewSubscription(
    token: string,
    subscriptionIdOrTopic: string
  ): Promise<any>;
}
