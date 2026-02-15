/**
 * Microsoft Graph API Provider
 * Implements EmailProvider interface for Microsoft 365 / Outlook
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
  TeamsMeeting,
  MeetingDetails,
  FolderType,
} from './types';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const AUTH_BASE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'Mail.ReadWrite',
  'Mail.Send',
  'MailboxSettings.ReadWrite',
  'Calendars.ReadWrite',
  'Contacts.Read',
  'OnlineMeetings.ReadWrite',
  'User.Read',
].join(' ');

export class MicrosoftProvider implements EmailProvider {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.AZURE_CLIENT_ID!;
    this.clientSecret = process.env.AZURE_CLIENT_SECRET!;
  }

  async getAuthUrl(
    redirectUri: string,
    state: string,
    codeChallenge: string
  ): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${AUTH_BASE_URL}/authorize?${params.toString()}`;
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

    const response = await fetch(`${AUTH_BASE_URL}/token`, {
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
      scope: SCOPES,
    });

    const response = await fetch(`${AUTH_BASE_URL}/token`, {
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
      refresh_token: data.refresh_token || refreshToken, // Graph may not return new refresh token
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
    };
  }

  async listMessages(
    token: string,
    options?: ListOptions
  ): Promise<{ messages: NormalizedMessage[]; cursor?: string }> {
    const limit = options?.limit || 50;
    const select =
      '$select=id,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,replyTo,body,bodyPreview,parentFolderId,isRead,flag,isDraft,hasAttachments,attachments,importance,receivedDateTime';
    const orderby = '$orderby=receivedDateTime desc';
    const top = `$top=${limit}`;

    let url = `${GRAPH_BASE_URL}/me/messages?${select}&${orderby}&${top}`;

    if (options?.folder_id) {
      url = `${GRAPH_BASE_URL}/me/mailFolders/${options.folder_id}/messages?${select}&${orderby}&${top}`;
    }

    if (options?.cursor) {
      url = options.cursor; // cursor is the @odata.nextLink
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List messages failed: ${error}`);
    }

    const data = await response.json();
    const messages: NormalizedMessage[] = data.value.map((msg: any) =>
      this.normalizeMessage(msg)
    );

    return {
      messages,
      cursor: data['@odata.nextLink'],
    };
  }

  async getMessage(token: string, messageId: string): Promise<NormalizedMessage> {
    const select =
      '?$select=id,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,replyTo,body,bodyPreview,parentFolderId,isRead,flag,isDraft,hasAttachments,attachments,importance,receivedDateTime';

    const response = await fetch(`${GRAPH_BASE_URL}/me/messages/${messageId}${select}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

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
    const graphMessage = {
      message: {
        subject: message.subject,
        body: {
          contentType: 'HTML',
          content: message.body_html,
        },
        toRecipients: message.to.map((r) => ({
          emailAddress: { address: r.email, name: r.name },
        })),
        ccRecipients: message.cc?.map((r) => ({
          emailAddress: { address: r.email, name: r.name },
        })),
        bccRecipients: message.bcc?.map((r) => ({
          emailAddress: { address: r.email, name: r.name },
        })),
        attachments: message.attachments?.map((att) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.name,
          contentType: att.content_type,
          contentBytes: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        })),
      },
      saveToSentItems: true,
    };

    const response = await fetch(`${GRAPH_BASE_URL}/me/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphMessage),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Send message failed: ${error}`);
    }

    // sendMail returns 202 Accepted with no body
    // We can't get the sent message ID directly, so return a placeholder
    return { id: 'sent' };
  }

  async replyToMessage(
    token: string,
    messageId: string,
    reply: ReplyParams
  ): Promise<{ id: string }> {
    const endpoint = reply.to_all ? 'replyAll' : 'reply';
    const graphReply = {
      comment: reply.body_html,
    };

    const response = await fetch(
      `${GRAPH_BASE_URL}/me/messages/${messageId}/${endpoint}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphReply),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Reply failed: ${error}`);
    }

    return { id: 'replied' };
  }

  async forwardMessage(
    token: string,
    messageId: string,
    forward: ForwardParams
  ): Promise<{ id: string }> {
    const graphForward = {
      comment: forward.comment || '',
      toRecipients: forward.to.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
    };

    const response = await fetch(
      `${GRAPH_BASE_URL}/me/messages/${messageId}/forward`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphForward),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Forward failed: ${error}`);
    }

    return { id: 'forwarded' };
  }

  async moveMessage(token: string, messageId: string, folderId: string): Promise<void> {
    const response = await fetch(
      `${GRAPH_BASE_URL}/me/messages/${messageId}/move`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destinationId: folderId }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Move message failed: ${error}`);
    }
  }

  async deleteMessage(token: string, messageId: string): Promise<void> {
    const response = await fetch(`${GRAPH_BASE_URL}/me/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

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
    const patch: any = {};

    if (updates.is_read !== undefined) {
      patch.isRead = updates.is_read;
    }

    if (updates.is_starred !== undefined) {
      patch.flag = {
        flagStatus: updates.is_starred ? 'flagged' : 'notFlagged',
      };
    }

    const response = await fetch(`${GRAPH_BASE_URL}/me/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update message failed: ${error}`);
    }
  }

  async listFolders(token: string): Promise<Folder[]> {
    const response = await fetch(`${GRAPH_BASE_URL}/me/mailFolders?$top=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List folders failed: ${error}`);
    }

    const data = await response.json();
    return data.value.map((folder: any) => this.normalizeFolder(folder));
  }

  async createFolder(token: string, name: string): Promise<Folder> {
    const response = await fetch(`${GRAPH_BASE_URL}/me/mailFolders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ displayName: name }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Create folder failed: ${error}`);
    }

    const data = await response.json();
    return this.normalizeFolder(data);
  }

  async createDraft(token: string, draft: DraftParams): Promise<{ id: string }> {
    const graphDraft = {
      subject: draft.subject || '',
      body: {
        contentType: 'HTML',
        content: draft.body_html || '',
      },
      toRecipients: draft.to?.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
      ccRecipients: draft.cc?.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
      bccRecipients: draft.bcc?.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
    };

    const response = await fetch(`${GRAPH_BASE_URL}/me/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphDraft),
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
    const graphDraft = {
      subject: draft.subject,
      body: draft.body_html
        ? {
            contentType: 'HTML',
            content: draft.body_html,
          }
        : undefined,
      toRecipients: draft.to?.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
      ccRecipients: draft.cc?.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
      bccRecipients: draft.bcc?.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
    };

    const response = await fetch(`${GRAPH_BASE_URL}/me/messages/${draftId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphDraft),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update draft failed: ${error}`);
    }
  }

  async deleteDraft(token: string, draftId: string): Promise<void> {
    await this.deleteMessage(token, draftId);
  }

  async getAttachment(
    token: string,
    messageId: string,
    attachmentId: string
  ): Promise<AttachmentData> {
    const response = await fetch(
      `${GRAPH_BASE_URL}/me/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Get attachment failed: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      content: Buffer.from(data.contentBytes, 'base64'),
      content_type: data.contentType,
      size: data.size,
    };
  }

  async deltaSync(
    token: string,
    cursor?: string
  ): Promise<{ changes: SyncChange[]; newCursor: string }> {
    let url = cursor || `${GRAPH_BASE_URL}/me/messages/delta?$select=id,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,replyTo,body,bodyPreview,parentFolderId,isRead,flag,isDraft,hasAttachments,attachments,importance,receivedDateTime`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delta sync failed: ${error}`);
    }

    const data = await response.json();
    const changes: SyncChange[] = [];

    for (const item of data.value) {
      if (item['@removed']) {
        changes.push({
          type: 'deleted',
          message_id: item.id,
        });
      } else {
        changes.push({
          type: item.isRead === undefined ? 'created' : 'updated',
          message: this.normalizeMessage(item),
        });
      }
    }

    return {
      changes,
      newCursor: data['@odata.deltaLink'],
    };
  }

  async listCalendars(token: string): Promise<CalendarMetadata[]> {
    const response = await fetch(`${GRAPH_BASE_URL}/me/calendars`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List calendars failed: ${error}`);
    }

    const data = await response.json();
    return data.value.map((cal: any) => ({
      id: cal.id,
      name: cal.name,
      description: cal.description || null,
      timezone: cal.timeZone || 'UTC',
      is_primary: cal.isDefaultCalendar || false,
      read_only: !cal.canEdit,
      color: cal.color || null,
    }));
  }

  async listEvents(
    token: string,
    calendarId: string,
    options?: EventListOptions
  ): Promise<{ events: CalendarEvent[]; cursor?: string }> {
    const startDate =
      options?.start_date || new Date().toISOString();
    const endDate =
      options?.end_date ||
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    let url = `${GRAPH_BASE_URL}/me/calendarView?startDateTime=${startDate}&endDateTime=${endDate}&$orderby=start/dateTime`;

    if (options?.cursor) {
      url = options.cursor;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List events failed: ${error}`);
    }

    const data = await response.json();
    const events: CalendarEvent[] = data.value.map((evt: any) =>
      this.normalizeEvent(evt, calendarId)
    );

    return {
      events,
      cursor: data['@odata.nextLink'],
    };
  }

  async createEvent(
    token: string,
    calendarId: string,
    event: CreateEventParams
  ): Promise<CalendarEvent> {
    const graphEvent = {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || '',
      },
      start: {
        dateTime: event.start_time,
        timeZone: event.timezone || 'UTC',
      },
      end: {
        dateTime: event.end_time,
        timeZone: event.timezone || 'UTC',
      },
      location: event.location ? { displayName: event.location } : undefined,
      attendees: event.attendees?.map((att) => ({
        emailAddress: { address: att.email, name: att.name },
        type: 'required',
      })),
      isAllDay: event.all_day || false,
      isOnlineMeeting: event.is_online_meeting || false,
      reminderMinutesBeforeStart: event.reminders?.[0]?.minutes_before || 15,
    };

    const response = await fetch(`${GRAPH_BASE_URL}/me/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphEvent),
    });

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
    const graphEvent: any = {};

    if (event.title) graphEvent.subject = event.title;
    if (event.description) {
      graphEvent.body = { contentType: 'HTML', content: event.description };
    }
    if (event.start_time) {
      graphEvent.start = {
        dateTime: event.start_time,
        timeZone: event.timezone || 'UTC',
      };
    }
    if (event.end_time) {
      graphEvent.end = {
        dateTime: event.end_time,
        timeZone: event.timezone || 'UTC',
      };
    }
    if (event.location) {
      graphEvent.location = { displayName: event.location };
    }
    if (event.attendees) {
      graphEvent.attendees = event.attendees.map((att) => ({
        emailAddress: { address: att.email, name: att.name },
        type: 'required',
      }));
    }

    const response = await fetch(
      `${GRAPH_BASE_URL}/me/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphEvent),
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
      `${GRAPH_BASE_URL}/me/calendars/${calendarId}/events/${eventId}`,
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
    let url =
      cursor ||
      `${GRAPH_BASE_URL}/me/calendars/${calendarId}/events/delta`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delta sync events failed: ${error}`);
    }

    const data = await response.json();
    const changes: SyncChange[] = data.value.map((item: any) => ({
      type: item['@removed'] ? 'deleted' : 'updated',
      message_id: item.id,
    }));

    return {
      changes,
      newCursor: data['@odata.deltaLink'],
    };
  }

  async listContacts(token: string, options: { limit: number }): Promise<Contact[]> {
    const response = await fetch(
      `${GRAPH_BASE_URL}/me/contacts?$top=${options.limit}&$orderby=displayName`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`List contacts failed: ${error}`);
    }

    const data = await response.json();
    return data.value.map((contact: any) => ({
      email: contact.emailAddresses?.[0]?.address || '',
      name: contact.displayName || null,
      phone: contact.mobilePhone || contact.businessPhones?.[0] || null,
      company: contact.companyName || null,
      job_title: contact.jobTitle || null,
    }));
  }

  async getUpcomingMeetings(token: string, daysAhead: number): Promise<TeamsMeeting[]> {
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `${GRAPH_BASE_URL}/me/calendarView?startDateTime=${startDate}&endDateTime=${endDate}&$filter=isOnlineMeeting eq true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Get upcoming meetings failed: ${error}`);
    }

    const data = await response.json();
    return data.value.map((meeting: any) => ({
      id: meeting.id,
      join_url: meeting.onlineMeeting?.joinUrl || '',
      title: meeting.subject,
      start_time: meeting.start.dateTime,
      end_time: meeting.end.dateTime,
    }));
  }

  async createTeamsMeeting(
    token: string,
    details: MeetingDetails
  ): Promise<TeamsMeeting> {
    const graphMeeting = {
      subject: details.subject,
      start: {
        dateTime: details.start_time,
        timeZone: 'UTC',
      },
      end: {
        dateTime: details.end_time,
        timeZone: 'UTC',
      },
      attendees: details.attendees?.map((att) => ({
        emailAddress: { address: att.email },
        type: 'required',
      })),
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
    };

    const response = await fetch(`${GRAPH_BASE_URL}/me/calendar/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphMeeting),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Create Teams meeting failed: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      join_url: data.onlineMeeting?.joinUrl || '',
      title: data.subject,
      start_time: data.start.dateTime,
      end_time: data.end.dateTime,
    };
  }

  // --- Helper methods ---

  private normalizeMessage(msg: any): NormalizedMessage {
    const from = msg.from?.emailAddress || { address: '', name: null };
    const toRecipients = (msg.toRecipients || []).map((r: any) => ({
      email: r.emailAddress.address,
      name: r.emailAddress.name || null,
    }));
    const ccRecipients = (msg.ccRecipients || []).map((r: any) => ({
      email: r.emailAddress.address,
      name: r.emailAddress.name || null,
    }));
    const bccRecipients = (msg.bccRecipients || []).map((r: any) => ({
      email: r.emailAddress.address,
      name: r.emailAddress.name || null,
    }));
    const replyTo = (msg.replyTo || []).map((r: any) => ({
      email: r.emailAddress.address,
      name: r.emailAddress.name || null,
    }));

    const attachments = (msg.attachments || []).map((att: any) => ({
      id: att.id,
      name: att.name,
      size: att.size,
      type: att.contentType,
      content_id: att.contentId || null,
    }));

    const folderType = this.mapFolderType(msg.parentFolderId);

    return {
      provider_message_id: msg.id,
      provider_thread_id: msg.conversationId || null,
      subject: msg.subject || null,
      from_email: from.address,
      from_name: from.name || null,
      to_recipients: toRecipients,
      cc_recipients: ccRecipients,
      bcc_recipients: bccRecipients,
      reply_to: replyTo,
      body_html: msg.body?.contentType === 'html' ? msg.body.content : null,
      body_text: msg.body?.contentType === 'text' ? msg.body.content : null,
      snippet: msg.bodyPreview || null,
      folder_id: msg.parentFolderId,
      folder_type: folderType,
      is_unread: !msg.isRead,
      is_starred: msg.flag?.flagStatus === 'flagged',
      is_draft: msg.isDraft || false,
      has_attachments: msg.hasAttachments || false,
      attachments,
      importance: msg.importance || 'normal',
      message_date: msg.receivedDateTime,
    };
  }

  private normalizeFolder(folder: any): Folder {
    const folderType = this.mapFolderTypeByName(folder.displayName);

    return {
      id: folder.id,
      name: folder.displayName,
      folder_type: folderType,
      is_system_folder: folder.isDefaultFolder || false,
      unread_count: folder.unreadItemCount || 0,
      total_count: folder.totalItemCount || 0,
    };
  }

  private normalizeEvent(evt: any, calendarId: string): CalendarEvent {
    const attendees = (evt.attendees || []).map((att: any) => ({
      email: att.emailAddress.address,
      name: att.emailAddress.name || null,
      status: att.status?.response || 'none',
    }));

    return {
      id: evt.id,
      calendar_id: calendarId,
      title: evt.subject,
      description: evt.body?.content || null,
      location: evt.location?.displayName || null,
      start_time: evt.start.dateTime,
      end_time: evt.end.dateTime,
      all_day: evt.isAllDay || false,
      timezone: evt.start.timeZone || 'UTC',
      recurrence: evt.recurrence || null,
      attendees,
      organizer_email: evt.organizer?.emailAddress?.address || null,
      is_online_meeting: evt.isOnlineMeeting || false,
      meeting_url: evt.onlineMeeting?.joinUrl || null,
      meeting_provider: evt.isOnlineMeeting ? 'teams' : null,
      reminders: [{ minutes_before: evt.reminderMinutesBeforeStart || 15, method: 'popup' }],
      color: null,
      status: evt.isCancelled ? 'cancelled' : 'confirmed',
    };
  }

  /**
   * Create a webhook subscription (Microsoft Graph)
   * Registers a webhook endpoint to receive push notifications when mailbox changes
   *
   * @param accessToken - Valid Microsoft Graph access token
   * @param notificationUrl - Public HTTPS URL to receive notifications
   * @param clientState - Random string for validation (store this for verification)
   * @returns Subscription details including ID and expiration
   *
   * Reference: https://docs.microsoft.com/en-us/graph/webhooks
   */
  async createSubscription(
    accessToken: string,
    notificationUrl: string,
    clientState: string
  ): Promise<{ subscriptionId: string; expiresAt: string }> {
    // Microsoft Graph subscriptions expire after max 3 days for mail resources
    const expirationDateTime = new Date();
    expirationDateTime.setDate(expirationDateTime.getDate() + 2); // 2 days to be safe

    const response = await fetch(`${GRAPH_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        changeType: 'created,updated',
        notificationUrl,
        resource: 'me/mailFolders/inbox/messages',
        expirationDateTime: expirationDateTime.toISOString(),
        clientState,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Microsoft Graph subscription: ${error}`);
    }

    const data = await response.json();
    return {
      subscriptionId: data.id,
      expiresAt: data.expirationDateTime,
    };
  }

  /**
   * Renew a webhook subscription (Microsoft Graph)
   * Extends the expiration time of an existing subscription
   *
   * @param accessToken - Valid Microsoft Graph access token
   * @param subscriptionId - ID of the existing subscription
   * @returns Updated subscription details
   *
   * Note: Microsoft Graph subscriptions expire after 3 days max, so renew every 2 days
   * Reference: https://docs.microsoft.com/en-us/graph/webhooks
   */
  async renewSubscription(
    accessToken: string,
    subscriptionId: string
  ): Promise<{ subscriptionId: string; expiresAt: string }> {
    // Extend expiration by 2 more days
    const expirationDateTime = new Date();
    expirationDateTime.setDate(expirationDateTime.getDate() + 2);

    const response = await fetch(
      `${GRAPH_BASE_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expirationDateTime: expirationDateTime.toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to renew Microsoft Graph subscription: ${error}`);
    }

    const data = await response.json();
    return {
      subscriptionId: data.id,
      expiresAt: data.expirationDateTime,
    };
  }

  /**
   * Delete a webhook subscription (Microsoft Graph)
   * Cancels push notifications for this subscription
   *
   * @param accessToken - Valid Microsoft Graph access token
   * @param subscriptionId - ID of the subscription to delete
   *
   * Reference: https://docs.microsoft.com/en-us/graph/webhooks
   */
  async deleteSubscription(
    accessToken: string,
    subscriptionId: string
  ): Promise<void> {
    const response = await fetch(
      `${GRAPH_BASE_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete Microsoft Graph subscription: ${error}`);
    }
  }

  private mapFolderType(folderId: string): FolderType {
    // This is a simplified mapping - in reality, you'd query folder metadata
    // For now, default to inbox
    return 'inbox';
  }

  private mapFolderTypeByName(name: string): FolderType {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('inbox')) return 'inbox';
    if (lowerName.includes('sent')) return 'sent';
    if (lowerName.includes('draft')) return 'drafts';
    if (lowerName.includes('trash') || lowerName.includes('deleted')) return 'trash';
    if (lowerName.includes('spam') || lowerName.includes('junk')) return 'spam';
    if (lowerName.includes('archive')) return 'archive';
    if (lowerName.includes('starred') || lowerName.includes('flagged')) return 'starred';
    if (lowerName.includes('important')) return 'important';
    return 'custom';
  }
}
