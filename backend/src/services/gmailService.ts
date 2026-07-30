// services/gmailService.ts
//
// Gmail API integration (send + read a mailbox via OAuth2), used instead of
// SMTP so the app never needs to hold a Gmail password/app-password - just a
// one-time-issued OAuth2 refresh token for the sending account.
//
// Wraps OAuth2 access-token refresh, MIME message construction, sending,
// listing/reading messages, attachment download, label changes, and the
// watch/history APIs (Gmail's push-notification mechanism) behind a small
// set of functions. Credentials are read from environment variables lazily
// (inside each call, with an optional per-call override), so a server
// without Gmail configured can still boot - it only fails when an email
// operation is actually attempted:
//
//   GMAIL_CLIENT_ID     - OAuth2 client id (Google Cloud Console > Credentials)
//   GMAIL_CLIENT_SECRET - OAuth2 client secret
//   GMAIL_REFRESH_TOKEN - offline-access refresh token for the sending account,
//                         issued once via the OAuth2 consent flow with at
//                         least the gmail.send scope (gmail.modify/gmail.readonly
//                         if this module's read/watch functions are used too)
//   GMAIL_SENDER_EMAIL  - the Gmail address these credentials belong to (used
//                         as the `From` header and the API's `userId`)
//   GMAIL_SENDER_NAME   - optional display name for the `From` header
//
// Docs: https://developers.google.com/gmail/api/guides/sending
//       https://developers.google.com/gmail/api/guides/push

import crypto from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  senderEmail: string;
  senderName?: string;
}

/** Optional per-call override, e.g. if a merchant one day gets their own Gmail sender. */
export interface GmailCredentialOverride {
  clientId?: string | null;
  clientSecret?: string | null;
  refreshToken?: string | null;
  senderEmail?: string | null;
  senderName?: string | null;
}

/**
 * Thrown for any non-2xx response from the Gmail/OAuth2 APIs. `details`
 * carries the raw parsed error body so callers can inspect Google's
 * `error.status`/`error.errors[]` fields without this module needing to
 * know about every error shape.
 */
export class GmailApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = "GmailApiError";
    this.status = status;
    this.details = details;
  }
}

function resolveConfig(overrides?: GmailCredentialOverride): GmailConfig {
  const clientId = overrides?.clientId || process.env.GMAIL_CLIENT_ID;
  const clientSecret = overrides?.clientSecret || process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = overrides?.refreshToken || process.env.GMAIL_REFRESH_TOKEN;
  const senderEmail = overrides?.senderEmail || process.env.GMAIL_SENDER_EMAIL;

  if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
    throw new Error(
      "Missing Gmail credentials: configure GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN / GMAIL_SENDER_EMAIL.",
    );
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    senderEmail,
    senderName: overrides?.senderName || process.env.GMAIL_SENDER_NAME || undefined,
  };
}

// ---------------------------------------------------------------------------
// OAuth2 access token (cached in-memory per refresh token, since it's only
// valid for ~1 hour and re-exchanging it on every send would be wasteful).
// ---------------------------------------------------------------------------

const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

async function getAccessToken(config: GmailConfig): Promise<string> {
  const cached = tokenCache.get(config.refreshToken);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.accessToken;
  }

  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
    });
  } catch (err: any) {
    throw new GmailApiError(`Failed to reach Google's OAuth2 token endpoint: ${err?.message || "network error"}`, 0);
  }

  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : {};

  if (!res.ok) {
    throw new GmailApiError(
      data?.error_description || data?.error || "Failed to refresh Gmail access token",
      res.status,
      data,
    );
  }

  const accessToken = data.access_token as string;
  const expiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
  tokenCache.set(config.refreshToken, { accessToken, expiresAt });
  return accessToken;
}

async function gmailRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: any;
    query?: Record<string, string | number | boolean | undefined>;
    credentials?: GmailCredentialOverride;
  } = {},
): Promise<T> {
  const config = resolveConfig(options.credentials);
  const accessToken = await getAccessToken(config);

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined) qs.set(key, String(value));
  }
  const query = qs.toString();
  const url = `${GMAIL_API_BASE}/users/${encodeURIComponent(config.senderEmail)}/${path}${query ? `?${query}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err: any) {
    throw new GmailApiError(`Failed to reach Gmail API: ${err?.message || "network error"}`, 0);
  }

  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : {};

  if (!res.ok) {
    throw new GmailApiError(data?.error?.message || `Gmail API request failed with status ${res.status}`, res.status, data);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// MIME message construction
// ---------------------------------------------------------------------------

/** Gmail's `raw` field is base64url (RFC 4648 §5) with no padding, not plain base64. */
function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** MIME-encodes a header value (RFC 2047) only when it contains non-ASCII characters, e.g. a customer's name. */
function encodeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

function formatAddress(address: string, name?: string): string {
  return name ? `${encodeHeaderValue(name)} <${address}>` : address;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  /** e.g. "application/pdf", "image/png". Defaults to "application/octet-stream". */
  mimeType?: string;
  /** Set to attach inline (referenced via `cid:<contentId>` in the HTML body) instead of as a downloadable file. */
  contentId?: string;
}

export interface SendEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Gmail thread id to reply within (e.g. continuing a booking's email thread). */
  threadId?: string;
  /** Message-Id of the message being replied to, for In-Reply-To/References headers. */
  inReplyToMessageId?: string;
  credentials?: GmailCredentialOverride;
}

function toAddressList(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value.join(", ") : value;
}

const MIXED_BOUNDARY = () => `mixed_${crypto.randomBytes(12).toString("hex")}`;
const ALT_BOUNDARY = () => `alt_${crypto.randomBytes(12).toString("hex")}`;

/**
 * Builds one self-contained MIME *child* part: its own Content-Type (and,
 * for plain leaves, Content-Transfer-Encoding) header, a blank line, then
 * the base64 body. Only valid nested inside a multipart boundary - a
 * top-level message must fold its Content-Type into the outer header block
 * instead (see buildMimeMessage), or mail clients will render the blank
 * line as ending the headers early and show the MIME headers as literal
 * body text.
 */
function leafPart(contentType: string, content: string): string {
  return [
    `Content-Type: ${contentType}`,
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(content, "utf-8").toString("base64"),
  ].join("\r\n");
}

/** Same idea as leafPart, but for a multipart/alternative child (text + html) nested inside an outer multipart/mixed. */
function alternativeChildPart(text: string, html: string): string {
  const boundary = ALT_BOUNDARY();
  return [
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    leafPart('text/plain; charset="UTF-8"', text),
    "",
    `--${boundary}`,
    leafPart('text/html; charset="UTF-8"', html),
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

function attachmentChildPart(attachment: EmailAttachment): string {
  const mimeType = attachment.mimeType || "application/octet-stream";
  const disposition = attachment.contentId ? "inline" : "attachment";
  const lines = [
    `Content-Type: ${mimeType}; name="${attachment.filename}"`,
    `Content-Disposition: ${disposition}; filename="${attachment.filename}"`,
    "Content-Transfer-Encoding: base64",
  ];
  if (attachment.contentId) lines.push(`Content-ID: <${attachment.contentId}>`);
  lines.push("");
  // Wrap base64 at 76 chars/line, matching MIME's line-length convention.
  lines.push(attachment.content.toString("base64").replace(/.{76}/g, "$&\r\n"));
  return lines.join("\r\n");
}

/**
 * Builds a complete RFC 2822 MIME message (headers + body + attachments) and
 * returns it as the base64url string Gmail's `messages.send`/`drafts.create`
 * `raw` field expects. Exported on its own too, in case a caller wants to
 * inspect/log the raw MIME before sending.
 */
export function buildMimeMessage(params: SendEmailParams, config: GmailConfig): string {
  const { to, cc, bcc, subject, text, html, replyTo, attachments = [], inReplyToMessageId } = params;

  if (!text && !html) {
    throw new Error("An email needs at least one of `text` or `html`.");
  }

  const topHeaders: string[] = [
    `From: ${formatAddress(config.senderEmail, config.senderName)}`,
    `To: ${toAddressList(to)}`,
  ];
  if (cc) topHeaders.push(`Cc: ${toAddressList(cc)}`);
  if (bcc) topHeaders.push(`Bcc: ${toAddressList(bcc)}`);
  topHeaders.push("MIME-Version: 1.0");
  topHeaders.push(`Subject: ${encodeHeaderValue(subject)}`);
  if (replyTo) topHeaders.push(`Reply-To: ${replyTo}`);
  if (inReplyToMessageId) {
    topHeaders.push(`In-Reply-To: ${inReplyToMessageId}`);
    topHeaders.push(`References: ${inReplyToMessageId}`);
  }

  if (attachments.length === 0) {
    // No attachments: the top-level entity IS the body, so its Content-Type
    // (and Content-Transfer-Encoding, for a plain leaf) must live in the
    // same header block as From/To/Subject - exactly one blank line
    // separates headers from content, never two.
    if (text && html) {
      const boundary = ALT_BOUNDARY();
      const body = [
        `--${boundary}`,
        leafPart('text/plain; charset="UTF-8"', text),
        "",
        `--${boundary}`,
        leafPart('text/html; charset="UTF-8"', html),
        "",
        `--${boundary}--`,
      ].join("\r\n");
      topHeaders.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      return base64UrlEncode([...topHeaders, "", body].join("\r\n"));
    }

    const contentType = html ? 'text/html; charset="UTF-8"' : 'text/plain; charset="UTF-8"';
    const content = (html || text)!;
    topHeaders.push(`Content-Type: ${contentType}`);
    topHeaders.push("Content-Transfer-Encoding: base64");
    return base64UrlEncode([...topHeaders, "", Buffer.from(content, "utf-8").toString("base64")].join("\r\n"));
  }

  // Attachments present: the top-level entity is multipart/mixed, wrapping
  // the body (a plain leaf, or a nested multipart/alternative) plus one
  // child part per attachment.
  const mixedBoundary = MIXED_BOUNDARY();
  const bodyChildPart = text && html
    ? alternativeChildPart(text, html)
    : leafPart(html ? 'text/html; charset="UTF-8"' : 'text/plain; charset="UTF-8"', (html || text)!);

  const parts: string[] = [`--${mixedBoundary}`, bodyChildPart, ""];
  for (const attachment of attachments) {
    parts.push(`--${mixedBoundary}`);
    parts.push(attachmentChildPart(attachment));
    parts.push("");
  }
  parts.push(`--${mixedBoundary}--`);

  topHeaders.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  return base64UrlEncode([...topHeaders, "", parts.join("\r\n")].join("\r\n"));
}

export interface SendEmailResult {
  id: string;
  threadId: string;
  labelIds?: string[];
}

/** Sends an email (plain text and/or HTML, with optional attachments) via the Gmail API. */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const config = resolveConfig(params.credentials);
  const raw = buildMimeMessage(params, config);

  return gmailRequest<SendEmailResult>("messages/send", {
    method: "POST",
    credentials: params.credentials,
    body: {
      raw,
      ...(params.threadId ? { threadId: params.threadId } : {}),
    },
  });
}

/** Sends an already-built raw MIME message (base64url-encoded), for callers who built it themselves. */
export async function sendRawMessage(
  raw: string,
  opts: { threadId?: string; credentials?: GmailCredentialOverride } = {},
): Promise<SendEmailResult> {
  return gmailRequest<SendEmailResult>("messages/send", {
    method: "POST",
    credentials: opts.credentials,
    body: {
      raw,
      ...(opts.threadId ? { threadId: opts.threadId } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Reading the mailbox
// ---------------------------------------------------------------------------

export interface ListMessagesParams {
  /** Gmail search syntax, e.g. "from:someone@example.com is:unread newer_than:7d". */
  query?: string;
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
  credentials?: GmailCredentialOverride;
}

export interface ListMessagesResult {
  messages: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export async function listMessages(params: ListMessagesParams = {}): Promise<ListMessagesResult> {
  const data = await gmailRequest<{
    messages?: { id: string; threadId: string }[];
    nextPageToken?: string;
    resultSizeEstimate: number;
  }>("messages", {
    credentials: params.credentials,
    query: {
      q: params.query,
      labelIds: params.labelIds?.join(","),
      maxResults: params.maxResults,
      pageToken: params.pageToken,
    },
  });
  return { messages: data.messages || [], nextPageToken: data.nextPageToken, resultSizeEstimate: data.resultSizeEstimate };
}

export interface ParsedMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  textBody?: string;
  htmlBody?: string;
  attachments: { attachmentId: string; filename: string; mimeType: string; size: number }[];
}

interface GmailPart {
  mimeType: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
}

/** Walks a Gmail message's (possibly nested multipart) payload, collecting the text/plain, text/html, and attachment parts. */
function extractParts(part: GmailPart, acc: { text?: string; html?: string; attachments: ParsedMessage["attachments"] }) {
  if (part.filename && part.body?.attachmentId) {
    acc.attachments.push({
      attachmentId: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType,
      size: part.body.size || 0,
    });
    return;
  }

  if (part.mimeType === "text/plain" && part.body?.data) {
    acc.text = Buffer.from(part.body.data, "base64").toString("utf-8");
  } else if (part.mimeType === "text/html" && part.body?.data) {
    acc.html = Buffer.from(part.body.data, "base64").toString("utf-8");
  }

  for (const child of part.parts || []) {
    extractParts(child, acc);
  }
}

/** Fetches and parses a single message into a plain-text-friendly shape (decoded body, attachment list, common headers). */
export async function getMessage(
  messageId: string,
  credentials?: GmailCredentialOverride,
): Promise<ParsedMessage> {
  const data = await gmailRequest<{
    id: string;
    threadId: string;
    labelIds?: string[];
    snippet: string;
    payload: GmailPart;
  }>(`messages/${encodeURIComponent(messageId)}`, {
    credentials,
    query: { format: "full" },
  });

  const headerLookup = new Map((data.payload.headers || []).map((h) => [h.name.toLowerCase(), h.value]));
  const acc: { text?: string; html?: string; attachments: ParsedMessage["attachments"] } = { attachments: [] };
  extractParts(data.payload, acc);

  return {
    id: data.id,
    threadId: data.threadId,
    labelIds: data.labelIds || [],
    snippet: data.snippet,
    subject: headerLookup.get("subject"),
    from: headerLookup.get("from"),
    to: headerLookup.get("to"),
    date: headerLookup.get("date"),
    textBody: acc.text,
    htmlBody: acc.html,
    attachments: acc.attachments,
  };
}

/** Downloads a single attachment's bytes (as referenced in ParsedMessage.attachments). */
export async function getAttachment(
  messageId: string,
  attachmentId: string,
  credentials?: GmailCredentialOverride,
): Promise<Buffer> {
  const data = await gmailRequest<{ data: string; size: number }>(
    `messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { credentials },
  );
  // Gmail base64url-encodes attachment data too, unlike the plain-base64
  // `content` this module accepts when sending - normalize before decoding.
  const normalized = data.data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

/** Adds/removes labels on a message - e.g. modifyLabels(id, [], ["UNREAD"]) to mark it read, or (id, ["TRASH"], ["INBOX"]) to archive-to-trash. */
export async function modifyLabels(
  messageId: string,
  addLabelIds: string[] = [],
  removeLabelIds: string[] = [],
  credentials?: GmailCredentialOverride,
): Promise<{ id: string; labelIds: string[] }> {
  return gmailRequest<{ id: string; labelIds: string[] }>(`messages/${encodeURIComponent(messageId)}/modify`, {
    method: "POST",
    credentials,
    body: { addLabelIds, removeLabelIds },
  });
}

export const markAsRead = (messageId: string, credentials?: GmailCredentialOverride) =>
  modifyLabels(messageId, [], ["UNREAD"], credentials);

export const markAsUnread = (messageId: string, credentials?: GmailCredentialOverride) =>
  modifyLabels(messageId, ["UNREAD"], [], credentials);

export async function trashMessage(messageId: string, credentials?: GmailCredentialOverride): Promise<void> {
  await gmailRequest(`messages/${encodeURIComponent(messageId)}/trash`, { method: "POST", credentials });
}

// ---------------------------------------------------------------------------
// Push notifications (Gmail's watch/history mechanism - the closest
// equivalent to a payment gateway's webhook, but delivered via Cloud
// Pub/Sub rather than a plain HTTP callback).
// ---------------------------------------------------------------------------

export interface WatchMailboxParams {
  /** Fully-qualified Cloud Pub/Sub topic, e.g. "projects/my-project/topics/gmail-inbox". */
  topicName: string;
  labelIds?: string[];
  credentials?: GmailCredentialOverride;
}

/**
 * Registers a watch on the mailbox: Gmail will publish a `{emailAddress,
 * historyId}` notification to the given Pub/Sub topic whenever the mailbox
 * changes. The watch expires after ~7 days and must be renewed
 * periodically. Once notified, call listHistory() with the last known
 * historyId to fetch what actually changed.
 */
export async function watchMailbox(params: WatchMailboxParams): Promise<{ historyId: string; expiration: string }> {
  return gmailRequest<{ historyId: string; expiration: string }>("watch", {
    method: "POST",
    credentials: params.credentials,
    body: {
      topicName: params.topicName,
      ...(params.labelIds ? { labelIds: params.labelIds } : {}),
    },
  });
}

/** Cancels any active watch on the mailbox. */
export async function stopWatch(credentials?: GmailCredentialOverride): Promise<void> {
  await gmailRequest("stop", { method: "POST", credentials });
}

export interface ListHistoryParams {
  /** The historyId from the last processed notification/sync point. */
  startHistoryId: string;
  credentials?: GmailCredentialOverride;
}

export interface HistoryChange {
  id: string;
  messagesAdded?: { message: { id: string; threadId: string } }[];
  messagesDeleted?: { message: { id: string; threadId: string } }[];
  labelsAdded?: { message: { id: string; threadId: string }; labelIds: string[] }[];
  labelsRemoved?: { message: { id: string; threadId: string }; labelIds: string[] }[];
}

/** Fetches everything that changed in the mailbox since `startHistoryId` - the payload to process after a watch() push notification arrives. */
export async function listHistory(params: ListHistoryParams): Promise<{ history: HistoryChange[]; historyId: string }> {
  const data = await gmailRequest<{ history?: HistoryChange[]; historyId: string }>("history", {
    credentials: params.credentials,
    query: { startHistoryId: params.startHistoryId },
  });
  return { history: data.history || [], historyId: data.historyId };
}

/** Quick way to confirm the configured credentials work and see basic mailbox stats (email address, message/thread counts, current historyId). */
export async function getProfile(
  credentials?: GmailCredentialOverride,
): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number; historyId: string }> {
  return gmailRequest<{ emailAddress: string; messagesTotal: number; threadsTotal: number; historyId: string }>(
    "profile",
    { credentials },
  );
}
