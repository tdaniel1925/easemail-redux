/**
 * Gmail API Provider
 * Implements EmailProvider interface for Gmail / Google Workspace
 */

import type {
  EmailProvider,
  TokenSet,
  NormalizedMessage,
  Folder,
  Contact,
  CalendarMetadata,
  CalendarEvent,
  SyncChange,
  ListOptions,
  EventListOptions,
  SendMessageParams,
  ReplyParams,
  ForwardParams,
  MessageUpdates,
  DraftParams,
  AttachmentData,
  CreateEventParams,
  UpdateEventParams,
  FolderType,
} from './types';

const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1';
const CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const PEOPLE_BASE_URL = 'https://people.googleapis.com/v1';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/contacts.readonly',
].join(' ');

export class GoogleProvider implements EmailProvider {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  }

  async getAuthUrl(
    redirectUri: string,
    state: string,
    codeChallenge: string
  ): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<TokenSet> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: refreshToken, // Gmail doesn't return new refresh token
      expires_in: data.expires_in,
      token_type: data.token_type,
    };
  }

  async listMessages(
    token: string,
    options?: ListOptions
  ): Promise<{ messages: NormalizedMessage[]; cursor?: string }> {
    const maxResults = options?.limit || 50;
    let q = options?.filter || '';

    // Map folder to Gmail label query
    if (options?.folder_id) {
      q = `label:${options.folder_id}`;
    }

    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
    });

    if (q) params.set('q', q);
    if (options?.cursor) params.set('pageToken', options.cursor);

    const response = await fetch(
      `${GMAIL_BASE_URL}/users/me/messages?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List messages failed: ${error}`);
    }

    const data = await response.json();
    const messageIds = data.messages || [];

    // Batch get full message details
    const messages: NormalizedMessage[] = [];
    for (const msg of messageIds) {
      try {
        const fullMessage = await this.getMessage(token, msg.id);
        messages.push(fullMessage);
      } catch (err) {
        console.error(`Failed to fetch message ${msg.id}:`, err);
      }
    }

    return {
      messages,
      cursor: data.nextPageToken,
    };
  }

  async getMessage(token: string, messageId: string): Promise<NormalizedMessage> {
    const response = await fetch(
      `${GMAIL_BASE_URL}/users/me/messages/${messageId}?format=full`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Get message failed: ${error}`);
    }

    const data = await response.json();
    return this.normalizeMessage(data);
  }

  async sendMessage(
    token: string,
    message: SendMessageParams
  ): Promise<{ id: string }> {
    const raw = this.createRFC2822Message(message);
    const base64Message = Buffer.from(raw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(`${GMAIL_BASE_URL}/users/me/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64Message }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Send message failed: ${error}`);
    }

    const data = await response.json();
    return { id: data.id };
  }

  async replyToMessage(
    token: string,
    messageId: string,
    reply: ReplyParams
  ): Promise<{ id: string }> {
    // Get original message to extract headers
    const original = await this.getMessage(token, messageId);

    const toRecipients = reply.to_all
      ? [...original.to_recipients, ...original.cc_recipients]
      : [{ email: original.from_email, name: original.from_name }];

    const replyMessage: SendMessageParams = {
      to: toRecipients,
      subject: original.subject?.startsWith('Re:')
        ? original.subject
        : `Re: ${original.subject}`,
      body_html: reply.body_html,
      body_text: reply.body_text || undefined,
      reply_to_message_id: messageId,
    };

    return this.sendMessage(token, replyMessage);
  }

  async forwardMessage(
    token: string,
    messageId: string,
    forward: ForwardParams
  ): Promise<{ id: string }> {
    const original = await this.getMessage(token, messageId);

    const forwardedBody = `
      ${forward.comment || ''}
      <br/><br/>
      ---------- Forwarded message ---------<br/>
      From: ${original.from_name || original.from_email}<br/>
      Date: ${original.message_date}<br/>
      Subject: ${original.subject}<br/>
      <br/>
      ${original.body_html || original.body_text || ''}
    `;

    const forwardMessage: SendMessageParams = {
      to: forward.to,
      subject: original.subject?.startsWith('Fwd:')
        ? original.subject
        : `Fwd: ${original.subject}`,
      body_html: forwardedBody,
    };

    return this.sendMessage(token, forwardMessage);
  }

  async moveMessage(token: string, messageId: string, folderId: string): Promise<void> {
    // Gmail uses labels, not folders
    // Moving = remove old labels, add new label
    const response = await fetch(
      `${GMAIL_BASE_URL}/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: [folderId],
          removeLabelIds: ['INBOX'], // Remove from inbox if moving
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Move message failed: ${error}`);
    }
  }

  async deleteMessage(token: string, messageId: string): Promise<void> {
    const response = await fetch(
      `${GMAIL_BASE_URL}/users/me/messages/${messageId}/trash`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delete message failed: ${error}`);
    }
  }

  async updateMessage(
    token: string,
    messageId: string,
    updates: MessageUpdates
  ): Promise<void> {
    const addLabelIds: string[] = [];
    const removeLabelIds: string[] = [];

    if (updates.is_read !== undefined) {
      if (updates.is_read) {
        removeLabelIds.push('UNREAD');
      } else {
        addLabelIds.push('UNREAD');
      }
    }

    if (updates.is_starred !== undefined) {
      if (updates.is_starred) {
        addLabelIds.push('STARRED');
      } else {
        removeLabelIds.push('STARRED');
      }
    }

    const response = await fetch(
      `${GMAIL_BASE_URL}/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addLabelIds, removeLabelIds }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update message failed: ${error}`);
    }
  }

  async listFolders(token: string): Promise<Folder[]> {
    const response = await fetch(`${GMAIL_BASE_URL}/users/me/labels`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List labels failed: ${error}`);
    }

    const data = await response.json();
    return data.labels.map((label: any) => this.normalizeLabel(label));
  }

  async createFolder(token: string, name: string): Promise<Folder> {
    const response = await fetch(`${GMAIL_BASE_URL}/users/me/labels`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Create label failed: ${error}`);
    }

    const data = await response.json();
    return this.normalizeLabel(data);
  }

  async createDraft(token: string, draft: DraftParams): Promise<{ id: string }> {
    const raw = this.createRFC2822Message({
      to: draft.to || [],
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject || '',
      body_html: draft.body_html || '',
      body_text: draft.body_text || undefined,
    });

    const base64Message = Buffer.from(raw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(`${GMAIL_BASE_URL}/users/me/drafts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: { raw: base64Message },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Create draft failed: ${error}`);
    }

    const data = await response.json();
    return { id: data.id };
  }

  async updateDraft(
    token: string,
    draftId: string,
    draft: DraftParams
  ): Promise<void> {
    const raw = this.createRFC2822Message({
      to: draft.to || [],
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject || '',
      body_html: draft.body_html || '',
      body_text: draft.body_text || undefined,
    });

    const base64Message = Buffer.from(raw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(`${GMAIL_BASE_URL}/users/me/drafts/${draftId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: { raw: base64Message },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update draft failed: ${error}`);
    }
  }

  async deleteDraft(token: string, draftId: string): Promise<void> {
    const response = await fetch(`${GMAIL_BASE_URL}/users/me/drafts/${draftId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delete draft failed: ${error}`);
    }
  }

  async getAttachment(
    token: string,
    messageId: string,
    attachmentId: string
  ): Promise<AttachmentData> {
    const response = await fetch(
      `${GMAIL_BASE_URL}/users/me/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Get attachment failed: ${error}`);
    }

    const data = await response.json();
    const content = Buffer.from(data.data, 'base64url');

    return {
      id: attachmentId,
      name: 'attachment', // Gmail doesn't return name in attachment endpoint
      content,
      content_type: 'application/octet-stream',
      size: data.size,
    };
  }

  async deltaSync(
    token: string,
    cursor?: string
  ): Promise<{ changes: SyncChange[]; newCursor: string }> {
    if (!cursor) {
      // First sync - get current history ID
      const profileResponse = await fetch(`${GMAIL_BASE_URL}/users/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = await profileResponse.json();
      return {
        changes: [],
        newCursor: profile.historyId,
      };
    }

    const response = await fetch(
      `${GMAIL_BASE_URL}/users/me/history?startHistoryId=${cursor}&historyTypes=messageAdded,messageDeleted,labelAdded,labelRemoved`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // History ID too old - need to do full resync
        return { changes: [], newCursor: cursor };
      }
      const error = await response.text();
      throw new Error(`Delta sync failed: ${error}`);
    }

    const data = await response.json();
    const changes: SyncChange[] = [];

    if (data.history) {
      for (const record of data.history) {
        if (record.messagesAdded) {
          for (const added of record.messagesAdded) {
            try {
              const message = await this.getMessage(token, added.message.id);
              changes.push({ type: 'created', message });
            } catch (err) {
              console.error('Failed to fetch added message:', err);
            }
          }
        }

        if (record.messagesDeleted) {
          for (const deleted of record.messagesDeleted) {
            changes.push({
              type: 'deleted',
              message_id: deleted.message.id,
            });
          }
        }

        if (record.labelsAdded || record.labelsRemoved) {
          // Treat label changes as updates
          const messageId =
            record.labelsAdded?.[0]?.message?.id ||
            record.labelsRemoved?.[0]?.message?.id;
          if (messageId) {
            try {
              const message = await this.getMessage(token, messageId);
              changes.push({ type: 'updated', message });
            } catch (err) {
              console.error('Failed to fetch updated message:', err);
            }
          }
        }
      }
    }

    return {
      changes,
      newCursor: data.historyId || cursor,
    };
  }

  async listCalendars(token: string): Promise<CalendarMetadata[]> {
    const response = await fetch(`${CALENDAR_BASE_URL}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List calendars failed: ${error}`);
    }

    const data = await response.json();
    return data.items.map((cal: any) => ({
      id: cal.id,
      name: cal.summary,
      description: cal.description || null,
      timezone: cal.timeZone || 'UTC',
      is_primary: cal.primary || false,
      read_only: cal.accessRole === 'reader',
      color: cal.backgroundColor || null,
    }));
  }

  async listEvents(
    token: string,
    calendarId: string,
    options?: EventListOptions
  ): Promise<{ events: CalendarEvent[]; cursor?: string }> {
    const timeMin =
      options?.start_date || new Date().toISOString();
    const timeMax =
      options?.end_date ||
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (options?.cursor) params.set('pageToken', options.cursor);

    const response = await fetch(
      `${CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List events failed: ${error}`);
    }

    const data = await response.json();
    const events: CalendarEvent[] = data.items.map((evt: any) =>
      this.normalizeEvent(evt, calendarId)
    );

    return {
      events,
      cursor: data.nextPageToken,
    };
  }

  async createEvent(
    token: string,
    calendarId: string,
    event: CreateEventParams
  ): Promise<CalendarEvent> {
    const googleEvent: any = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.all_day
        ? { date: event.start_time.split('T')[0] }
        : { dateTime: event.start_time, timeZone: event.timezone || 'UTC' },
      end: event.all_day
        ? { date: event.end_time.split('T')[0] }
        : { dateTime: event.end_time, timeZone: event.timezone || 'UTC' },
      attendees: event.attendees?.map((att) => ({ email: att.email })),
      reminders: event.reminders
        ? {
            useDefault: false,
            overrides: event.reminders.map((r) => ({
              method: r.method === 'popup' ? 'popup' : 'email',
              minutes: r.minutes_before,
            })),
          }
        : { useDefault: true },
    };

    if (event.is_online_meeting) {
      googleEvent.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const params = event.is_online_meeting
      ? '?conferenceDataVersion=1'
      : '';

    const response = await fetch(
      `${CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events${params}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Create event failed: ${error}`);
    }

    const data = await response.json();
    return this.normalizeEvent(data, calendarId);
  }

  async updateEvent(
    token: string,
    calendarId: string,
    eventId: string,
    event: UpdateEventParams
  ): Promise<CalendarEvent> {
    const googleEvent: any = {};

    if (event.title) googleEvent.summary = event.title;
    if (event.description !== undefined) googleEvent.description = event.description;
    if (event.location !== undefined) googleEvent.location = event.location;
    if (event.start_time) {
      googleEvent.start = event.all_day
        ? { date: event.start_time.split('T')[0] }
        : { dateTime: event.start_time, timeZone: event.timezone || 'UTC' };
    }
    if (event.end_time) {
      googleEvent.end = event.all_day
        ? { date: event.end_time.split('T')[0] }
        : { dateTime: event.end_time, timeZone: event.timezone || 'UTC' };
    }
    if (event.attendees) {
      googleEvent.attendees = event.attendees.map((att) => ({ email: att.email }));
    }
    if (event.status) {
      googleEvent.status = event.status;
    }

    const response = await fetch(
      `${CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update event failed: ${error}`);
    }

    const data = await response.json();
    return this.normalizeEvent(data, calendarId);
  }

  async deleteEvent(token: string, calendarId: string, eventId: string): Promise<void> {
    const response = await fetch(
      `${CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delete event failed: ${error}`);
    }
  }

  async deltaSyncEvents(
    token: string,
    calendarId: string,
    cursor?: string
  ): Promise<{ changes: SyncChange[]; newCursor: string }> {
    const params = new URLSearchParams();
    if (cursor) params.set('syncToken', cursor);

    const response = await fetch(
      `${CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delta sync events failed: ${error}`);
    }

    const data = await response.json();
    const changes: SyncChange[] = data.items.map((item: any) => ({
      type: item.status === 'cancelled' ? 'deleted' : 'updated',
      message_id: item.id,
    }));

    return {
      changes,
      newCursor: data.nextSyncToken || cursor || '',
    };
  }

  async listContacts(token: string, options: { limit: number }): Promise<Contact[]> {
    const response = await fetch(
      `${PEOPLE_BASE_URL}/people/me/connections?pageSize=${options.limit}&personFields=names,emailAddresses,phoneNumbers,organizations`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List contacts failed: ${error}`);
    }

    const data = await response.json();
    return (data.connections || []).map((contact: any) => ({
      email: contact.emailAddresses?.[0]?.value || '',
      name: contact.names?.[0]?.displayName || null,
      phone: contact.phoneNumbers?.[0]?.value || null,
      company: contact.organizations?.[0]?.name || null,
      job_title: contact.organizations?.[0]?.title || null,
    }));
  }

  // --- Helper methods ---

  private normalizeMessage(msg: any): NormalizedMessage {
    const headers = this.parseHeaders(msg.payload?.headers || []);
    const labelIds = msg.labelIds || [];

    const from = this.parseEmailAddress(headers['from'] || '');
    const to = this.parseEmailAddresses(headers['to'] || '');
    const cc = this.parseEmailAddresses(headers['cc'] || '');
    const bcc = this.parseEmailAddresses(headers['bcc'] || '');
    const replyTo = this.parseEmailAddresses(headers['reply-to'] || '');

    const { html, text } = this.extractBody(msg.payload);
    const attachments = this.extractAttachments(msg.payload);

    const folderType = this.mapLabelToFolderType(labelIds);

    return {
      provider_message_id: msg.id,
      provider_thread_id: msg.threadId || null,
      subject: headers['subject'] || null,
      from_email: from.email,
      from_name: from.name,
      to_recipients: to,
      cc_recipients: cc,
      bcc_recipients: bcc,
      reply_to: replyTo,
      body_html: html,
      body_text: text,
      snippet: msg.snippet || null,
      folder_id: labelIds[0] || 'INBOX',
      folder_type: folderType,
      is_unread: labelIds.includes('UNREAD'),
      is_starred: labelIds.includes('STARRED'),
      is_draft: labelIds.includes('DRAFT'),
      has_attachments: attachments.length > 0,
      attachments,
      importance: 'normal',
      message_date: new Date(parseInt(msg.internalDate)).toISOString(),
    };
  }

  private normalizeLabel(label: any): Folder {
    const folderType = this.mapLabelNameToFolderType(label.name || label.id);

    return {
      id: label.id,
      name: label.name || label.id,
      folder_type: folderType,
      is_system_folder: label.type === 'system',
      unread_count: label.messagesUnread || 0,
      total_count: label.messagesTotal || 0,
    };
  }

  private normalizeEvent(evt: any, calendarId: string): CalendarEvent {
    const attendees = (evt.attendees || []).map((att: any) => ({
      email: att.email,
      name: att.displayName || null,
      status: att.responseStatus || 'needsAction',
    }));

    const isAllDay = !!evt.start?.date;
    const startTime = evt.start?.dateTime || evt.start?.date;
    const endTime = evt.end?.dateTime || evt.end?.date;

    return {
      id: evt.id,
      calendar_id: calendarId,
      title: evt.summary || 'Untitled',
      description: evt.description || null,
      location: evt.location || null,
      start_time: startTime,
      end_time: endTime,
      all_day: isAllDay,
      timezone: evt.start?.timeZone || 'UTC',
      recurrence: evt.recurrence ? evt.recurrence.join(';') : null,
      attendees,
      organizer_email: evt.organizer?.email || null,
      is_online_meeting: !!evt.hangoutLink || !!evt.conferenceData,
      meeting_url: evt.hangoutLink || evt.conferenceData?.entryPoints?.[0]?.uri || null,
      meeting_provider: evt.hangoutLink ? 'meet' : null,
      reminders: (evt.reminders?.overrides || []).map((r: any) => ({
        minutes_before: r.minutes,
        method: r.method,
      })),
      color: null,
      status: evt.status || 'confirmed',
    };
  }

  private parseHeaders(headers: any[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const header of headers) {
      result[header.name.toLowerCase()] = header.value;
    }
    return result;
  }

  private parseEmailAddress(str: string): { email: string; name: string | null } {
    const match = str.match(/^(.+)<(.+)>$/);
    if (match) {
      return { email: match[2].trim(), name: match[1].trim() };
    }
    return { email: str.trim(), name: null };
  }

  private parseEmailAddresses(str: string): { email: string; name: string | null }[] {
    if (!str) return [];
    return str.split(',').map((s) => this.parseEmailAddress(s));
  }

  private extractBody(payload: any): { html: string | null; text: string | null } {
    if (!payload) return { html: null, text: null };

    if (payload.mimeType === 'text/html') {
      return {
        html: this.decodeBody(payload.body?.data),
        text: null,
      };
    }

    if (payload.mimeType === 'text/plain') {
      return {
        html: null,
        text: this.decodeBody(payload.body?.data),
      };
    }

    if (payload.parts) {
      let html: string | null = null;
      let text: string | null = null;

      for (const part of payload.parts) {
        if (part.mimeType === 'text/html') {
          html = this.decodeBody(part.body?.data);
        } else if (part.mimeType === 'text/plain') {
          text = this.decodeBody(part.body?.data);
        } else if (part.parts) {
          const nested = this.extractBody(part);
          if (nested.html) html = nested.html;
          if (nested.text) text = nested.text;
        }
      }

      return { html, text };
    }

    return { html: null, text: null };
  }

  private decodeBody(data: string | undefined): string | null {
    if (!data) return null;
    return Buffer.from(data, 'base64url').toString('utf-8');
  }

  private extractAttachments(
    payload: any
  ): { id: string; name: string; size: number; type: string }[] {
    if (!payload) return [];

    const attachments: any[] = [];

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            name: part.filename,
            size: part.body.size || 0,
            type: part.mimeType || 'application/octet-stream',
          });
        }

        if (part.parts) {
          attachments.push(...this.extractAttachments(part));
        }
      }
    }

    return attachments;
  }

  private mapLabelToFolderType(labelIds: string[]): FolderType {
    if (labelIds.includes('INBOX')) return 'inbox';
    if (labelIds.includes('SENT')) return 'sent';
    if (labelIds.includes('DRAFT')) return 'drafts';
    if (labelIds.includes('TRASH')) return 'trash';
    if (labelIds.includes('SPAM')) return 'spam';
    if (labelIds.includes('STARRED')) return 'starred';
    if (labelIds.includes('IMPORTANT')) return 'important';
    return 'custom';
  }

  private mapLabelNameToFolderType(name: string): FolderType {
    const lowerName = name.toLowerCase();
    if (lowerName === 'inbox') return 'inbox';
    if (lowerName === 'sent') return 'sent';
    if (lowerName === 'drafts' || lowerName === 'draft') return 'drafts';
    if (lowerName === 'trash') return 'trash';
    if (lowerName === 'spam') return 'spam';
    if (lowerName === 'starred') return 'starred';
    if (lowerName === 'important') return 'important';
    return 'custom';
  }

  /**
   * Create a push notification subscription (Gmail watch)
   * Registers a Cloud Pub/Sub topic to receive push notifications when mailbox changes
   *
   * @param accessToken - Valid Gmail access token
   * @param topicName - Full Cloud Pub/Sub topic name (projects/{project}/topics/{topic})
   * @returns Subscription details including historyId and expiration
   *
   * Reference: https://developers.google.com/gmail/api/guides/push
   */
  async createSubscription(
    accessToken: string,
    topicName: string
  ): Promise<{ historyId: string; expiration: number }> {
    const response = await fetch(`${GMAIL_BASE_URL}/users/me/watch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName,
        labelIds: ['INBOX', 'SENT', 'DRAFT', 'TRASH'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Gmail watch subscription: ${error}`);
    }

    const data = await response.json();
    return {
      historyId: data.historyId,
      expiration: data.expiration,
    };
  }

  /**
   * Renew a push notification subscription (Gmail watch)
   * Extends the expiration time of an existing subscription
   *
   * @param accessToken - Valid Gmail access token
   * @param topicName - Full Cloud Pub/Sub topic name (projects/{project}/topics/{topic})
   * @returns Updated subscription details
   *
   * Note: Gmail watch subscriptions expire after 7 days, so renew every 6 days
   * Reference: https://developers.google.com/gmail/api/guides/push
   */
  async renewSubscription(
    accessToken: string,
    topicName: string
  ): Promise<{ historyId: string; expiration: number }> {
    // Gmail doesn't have a separate renew endpoint - just call watch again
    // This replaces the existing subscription with a new one
    return this.createSubscription(accessToken, topicName);
  }

  /**
   * Stop a push notification subscription (Gmail watch)
   * Cancels push notifications for this mailbox
   *
   * @param accessToken - Valid Gmail access token
   *
   * Reference: https://developers.google.com/gmail/api/guides/push
   */
  async deleteSubscription(accessToken: string): Promise<void> {
    const response = await fetch(`${GMAIL_BASE_URL}/users/me/stop`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to stop Gmail watch subscription: ${error}`);
    }
  }

  private createRFC2822Message(message: SendMessageParams): string {
    const to = message.to.map((r) => `${r.name || r.email} <${r.email}>`).join(', ');
    const cc = message.cc?.map((r) => `${r.name || r.email} <${r.email}>`).join(', ');
    const bcc = message.bcc?.map((r) => `${r.name || r.email} <${r.email}>`).join(', ');

    let raw = '';
    raw += `To: ${to}\r\n`;
    if (cc) raw += `Cc: ${cc}\r\n`;
    if (bcc) raw += `Bcc: ${bcc}\r\n`;
    raw += `Subject: ${message.subject}\r\n`;
    raw += `MIME-Version: 1.0\r\n`;
    raw += `Content-Type: text/html; charset=UTF-8\r\n`;
    raw += `\r\n`;
    raw += message.body_html;

    return raw;
  }
}
