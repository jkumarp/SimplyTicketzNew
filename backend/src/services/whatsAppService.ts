// services/whatsAppService.ts
//
// WhatsApp Cloud API (Meta Graph API) integration.
//
// Wraps message sending (text, template, image, document), media upload/
// download, read-receipts, and inbound-webhook verification/parsing behind
// a small set of functions. Credentials are read from environment variables
// lazily (inside each call, with an optional per-call override), so a
// server without WhatsApp configured can still boot - it only fails when a
// WhatsApp operation is actually attempted:
//
//   WHATSAPP_PHONE_NUMBER_ID      - the sending number's Cloud API phone number id
//   WHATSAPP_ACCESS_TOKEN         - a permanent System User access token
//   WHATSAPP_BUSINESS_ACCOUNT_ID  - WABA id, only needed for template management calls
//   WHATSAPP_API_VERSION          - Graph API version, defaults to 'v21.0'
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN - shared secret for the webhook GET handshake
//   WHATSAPP_APP_SECRET           - app secret used to verify X-Hub-Signature-256
//
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

import crypto from "crypto";

const DEFAULT_API_VERSION = "v21.0";
const GRAPH_BASE_URL = "https://graph.facebook.com";

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
  businessAccountId?: string;
}

/** Optional per-call override, e.g. if a merchant one day gets their own WhatsApp number/token. */
export interface WhatsAppCredentialOverride {
  phoneNumberId?: string | null;
  accessToken?: string | null;
  apiVersion?: string | null;
  businessAccountId?: string | null;
}

/**
 * Thrown for any non-2xx response from the Graph API. `details` carries the
 * raw parsed error body so callers can inspect Meta's `error.type`/
 * `error.error_subcode` fields without this module needing to know about
 * every error shape.
 */
export class WhatsAppApiError extends Error {
  status: number;
  code?: number;
  details?: any;

  constructor(message: string, status: number, code?: number, details?: any) {
    super(message);
    this.name = "WhatsAppApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function resolveConfig(overrides?: WhatsAppCredentialOverride): WhatsAppConfig {
  const phoneNumberId = overrides?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = overrides?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("Missing WhatsApp credentials: configure WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN.");
  }

  return {
    phoneNumberId,
    accessToken,
    apiVersion: overrides?.apiVersion || process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION,
    businessAccountId: overrides?.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || undefined,
  };
}

/**
 * Strips everything but digits and prefixes the country code if the number
 * doesn't already start with one. WhatsApp's Cloud API expects `to` as a
 * full E.164-ish number with no `+`/spaces/dashes (e.g. "919876543210").
 */
export function normalizePhoneNumber(phone: string, countryCode: string | number = 91): string {
  const digits = String(phone).replace(/\D/g, "");
  const cc = String(countryCode).replace(/\D/g, "");
  if (!digits) return digits;
  return digits.startsWith(cc) ? digits : `${cc}${digits}`;
}

async function graphRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: any;
    isFormData?: boolean;
    credentials?: WhatsAppCredentialOverride;
  } = {},
): Promise<T> {
  const config = resolveConfig(options.credentials);
  const url = `${GRAPH_BASE_URL}/${config.apiVersion}/${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        ...(options.isFormData ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined
        ? undefined
        : options.isFormData
        ? options.body
        : JSON.stringify(options.body),
    });
  } catch (err: any) {
    throw new WhatsAppApiError(`Failed to reach WhatsApp: ${err?.message || "network error"}`, 0);
  }

  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : {};

  if (!res.ok) {
    const err = data?.error || {};
    throw new WhatsAppApiError(
      err.message || `WhatsApp request failed with status ${res.status}`,
      res.status,
      err.code,
      data,
    );
  }

  return data as T;
}

function getConfig(overrides?: WhatsAppCredentialOverride): WhatsAppConfig {
  return resolveConfig(overrides);
}

// ---------------------------------------------------------------------------
// Outbound messages
// ---------------------------------------------------------------------------

export interface WhatsAppSendResult {
  messaging_product: "whatsapp";
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export interface SendTextMessageParams {
  /** Recipient in E.164-ish digits-only form, e.g. "919876543210" - see normalizePhoneNumber. */
  to: string;
  body: string;
  /** Render the first URL in `body` as a link preview. Defaults to false. */
  previewUrl?: boolean;
  /** Reply-in-context to an existing message id. */
  replyToMessageId?: string;
  credentials?: WhatsAppCredentialOverride;
}

/**
 * Sends a free-form text message. Only deliverable within the 24-hour
 * "customer service window" after the user last messaged in - for the first
 * outbound message (e.g. a booking confirmation) use sendTemplateMessage
 * instead, since WhatsApp requires a pre-approved template outside that window.
 */
export async function sendTextMessage(params: SendTextMessageParams): Promise<WhatsAppSendResult> {
  const { to, body, previewUrl, replyToMessageId, credentials } = params;
  const cfg = getConfig(credentials);

  return graphRequest<WhatsAppSendResult>(`${cfg.phoneNumberId}/messages`, {
    method: "POST",
    credentials,
    body: {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body, preview_url: !!previewUrl },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    },
  });
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: "quick_reply" | "url";
  index?: number;
  parameters: Array<
    | { type: "text"; text: string }
    | { type: "currency"; currency: { fallback_value: string; code: string; amount_1000: number } }
    | { type: "date_time"; date_time: { fallback_value: string } }
    | { type: "image"; image: { link: string } | { id: string } }
    | { type: "document"; document: ({ link: string } | { id: string }) & { filename?: string } }
  >;
}

export interface SendTemplateMessageParams {
  to: string;
  templateName: string;
  /** e.g. "en_US" - must match a language the template was approved in. */
  languageCode?: string;
  /** Fills the template's {{1}}, {{2}}, ... placeholders, per component. */
  components?: TemplateComponent[];
  credentials?: WhatsAppCredentialOverride;
}

/**
 * Sends a pre-approved message template - the only way to start a
 * conversation (e.g. a ticket booking confirmation or an OTP) outside the
 * 24-hour customer service window. The template itself (name/language/
 * component layout) must already be approved in WhatsApp Manager; this
 * function only fills in its parameters and sends it.
 */
export async function sendTemplateMessage(params: SendTemplateMessageParams): Promise<WhatsAppSendResult> {
  const { to, templateName, languageCode = "en_US", components, credentials } = params;
  const cfg = getConfig(credentials);

  return graphRequest<WhatsAppSendResult>(`${cfg.phoneNumberId}/messages`, {
    method: "POST",
    credentials,
    body: {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components && components.length ? { components } : {}),
      },
    },
  });
}

export interface SendMediaMessageParams {
  to: string;
  /** One of mediaLink or mediaId is required - a hosted URL, or an id from uploadMedia(). */
  mediaLink?: string;
  mediaId?: string;
  caption?: string;
  /** Required (and only used) for type "document". */
  filename?: string;
  credentials?: WhatsAppCredentialOverride;
}

function buildMediaPayload(
  to: string,
  type: "image" | "document" | "video" | "audio" | "sticker",
  { mediaLink, mediaId, caption, filename }: Omit<SendMediaMessageParams, "to" | "credentials">,
) {
  if (!mediaLink && !mediaId) {
    throw new Error(`Either mediaLink or mediaId is required to send a WhatsApp ${type} message.`);
  }
  const mediaObject: Record<string, unknown> = mediaId ? { id: mediaId } : { link: mediaLink };
  if (caption && (type === "image" || type === "document" || type === "video")) {
    mediaObject.caption = caption;
  }
  if (filename && type === "document") {
    mediaObject.filename = filename;
  }

  return {
    messaging_product: "whatsapp" as const,
    to,
    type,
    [type]: mediaObject,
  };
}

/** Sends an image (e.g. a ticket's QR code) either from a public URL or a previously uploaded media id. */
export async function sendImageMessage(params: SendMediaMessageParams): Promise<WhatsAppSendResult> {
  const cfg = getConfig(params.credentials);
  return graphRequest<WhatsAppSendResult>(`${cfg.phoneNumberId}/messages`, {
    method: "POST",
    credentials: params.credentials,
    body: buildMediaPayload(params.to, "image", params),
  });
}

/** Sends a document (e.g. a PDF invoice) either from a public URL or a previously uploaded media id. */
export async function sendDocumentMessage(params: SendMediaMessageParams): Promise<WhatsAppSendResult> {
  const cfg = getConfig(params.credentials);
  return graphRequest<WhatsAppSendResult>(`${cfg.phoneNumberId}/messages`, {
    method: "POST",
    credentials: params.credentials,
    body: buildMediaPayload(params.to, "document", params),
  });
}

/** Marks an inbound message as read (shows the double blue tick to the customer). */
export async function markMessageAsRead(
  messageId: string,
  credentials?: WhatsAppCredentialOverride,
): Promise<{ success: boolean }> {
  const cfg = getConfig(credentials);
  return graphRequest<{ success: boolean }>(`${cfg.phoneNumberId}/messages`, {
    method: "POST",
    credentials,
    body: {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    },
  });
}

// ---------------------------------------------------------------------------
// Media upload/download
// ---------------------------------------------------------------------------

export interface UploadMediaParams {
  /** Raw file bytes - e.g. a rendered ticket QR PNG or invoice PDF. */
  file: Buffer;
  filename: string;
  /** e.g. "image/png", "application/pdf". */
  mimeType: string;
  credentials?: WhatsAppCredentialOverride;
}

/**
 * Uploads media to WhatsApp ahead of sending it, returning a media id you
 * can pass as `mediaId` to sendImageMessage/sendDocumentMessage. Media ids
 * expire after ~30 days and are single-app-scoped, so prefer a hosted
 * `mediaLink` for anything long-lived (e.g. a ticket's public QR image URL).
 */
export async function uploadMedia(params: UploadMediaParams): Promise<{ mediaId: string }> {
  const { file, filename, mimeType, credentials } = params;
  const cfg = getConfig(credentials);

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(file)], { type: mimeType }), filename);

  const data = await graphRequest<{ id: string }>(`${cfg.phoneNumberId}/media`, {
    method: "POST",
    isFormData: true,
    credentials,
    body: form,
  });

  return { mediaId: data.id };
}

/** Looks up the temporary CDN URL + metadata for a previously uploaded/received media id. */
export async function getMediaUrl(
  mediaId: string,
  credentials?: WhatsAppCredentialOverride,
): Promise<{ url: string; mimeType: string; sha256: string; fileSize: number }> {
  const data = await graphRequest<{ url: string; mime_type: string; sha256: string; file_size: number }>(
    mediaId,
    { credentials },
  );
  return { url: data.url, mimeType: data.mime_type, sha256: data.sha256, fileSize: data.file_size };
}

/**
 * Downloads media bytes from the temporary CDN URL returned by getMediaUrl.
 * This is a plain authenticated GET (not versioned under the Graph API
 * path), so it bypasses graphRequest and hits the URL directly.
 */
export async function downloadMedia(
  mediaUrl: string,
  credentials?: WhatsAppCredentialOverride,
): Promise<Buffer> {
  const cfg = getConfig(credentials);
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
  });
  if (!res.ok) {
    throw new WhatsAppApiError(`Failed to download WhatsApp media (status ${res.status})`, res.status);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Webhook verification & parsing
// ---------------------------------------------------------------------------

/**
 * Handles Meta's webhook verification GET handshake
 * (`?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`), performed
 * once when the webhook URL is registered in the Meta App dashboard.
 * Returns the challenge string to echo back with a 200 if the token
 * matches WHATSAPP_WEBHOOK_VERIFY_TOKEN, or null if it doesn't (the caller
 * should respond 403).
 */
export function verifyWebhookChallenge(query: {
  "hub.mode"?: string;
  "hub.verify_token"?: string;
  "hub.challenge"?: string;
}): string | null {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    throw new Error("Missing WhatsApp environment variable: WHATSAPP_WEBHOOK_VERIFY_TOKEN.");
  }
  if (query["hub.mode"] !== "subscribe" || query["hub.verify_token"] !== verifyToken) {
    return null;
  }
  return query["hub.challenge"] ?? null;
}

/**
 * Verifies the `X-Hub-Signature-256` header Meta signs every webhook POST
 * with (HMAC-SHA256 of the raw request body, keyed by the app secret).
 * `rawBody` MUST be the exact bytes Meta sent (read before any JSON
 * body-parsing middleware re-serializes it) - see the Cashfree/Easebuzz
 * services for the same caveat on their own webhook signatures.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    throw new Error("Missing WhatsApp environment variable: WHATSAPP_APP_SECRET.");
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader.slice("sha256=".length));

  // timingSafeEqual throws on length mismatch, so check that separately
  // rather than letting a length difference short-circuit unsafely.
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface ParsedIncomingMessage {
  messageId: string;
  from: string;
  timestamp: string;
  type: string;
  text?: string;
  /** Present for interactive (button/list) replies. */
  buttonReplyId?: string;
  /** Present for image/document/audio/video/sticker messages. */
  mediaId?: string;
}

export interface ParsedStatusUpdate {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed" | string;
  timestamp: string;
  recipientId: string;
}

export interface ParsedWebhookEvent {
  phoneNumberId?: string;
  messages: ParsedIncomingMessage[];
  statuses: ParsedStatusUpdate[];
}

/**
 * Flattens a raw Cloud API webhook payload (`entry[].changes[].value...`)
 * into the two things a handler usually cares about: newly received
 * messages, and delivery/read status updates for messages this app sent.
 * Ignores changes that aren't `messages` field updates (e.g. account
 * review/template status webhooks), since those aren't relevant here.
 */
export function parseIncomingWebhook(payload: any): ParsedWebhookEvent {
  const messages: ParsedIncomingMessage[] = [];
  const statuses: ParsedStatusUpdate[] = [];
  let phoneNumberId: string | undefined;

  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== "messages") continue;
      const value = change.value ?? {};
      phoneNumberId = value.metadata?.phone_number_id ?? phoneNumberId;

      for (const msg of value.messages ?? []) {
        messages.push({
          messageId: msg.id,
          from: msg.from,
          timestamp: msg.timestamp,
          type: msg.type,
          text: msg.type === "text" ? msg.text?.body : undefined,
          buttonReplyId: msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id,
          mediaId: msg[msg.type]?.id,
        });
      }

      for (const status of value.statuses ?? []) {
        statuses.push({
          messageId: status.id,
          status: status.status,
          timestamp: status.timestamp,
          recipientId: status.recipient_id,
        });
      }
    }
  }

  return { phoneNumberId, messages, statuses };
}
