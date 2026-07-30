// services/emailService.ts
//
// Email sending via Nodemailer. Supports two transports, chosen with
// EMAIL_PROVIDER:
//
//   'gmail' (default) - sends through a Gmail account using OAuth2 (no
//   password/app-password ever touches this app - just a one-time-issued
//   OAuth2 refresh token), via Nodemailer's built-in Gmail service.
//   Required env vars:
//     GMAIL_CLIENT_ID     - OAuth2 client id (Google Cloud Console > Credentials)
//     GMAIL_CLIENT_SECRET - OAuth2 client secret
//     GMAIL_REFRESH_TOKEN - offline-access refresh token for the sending
//                           account, issued once via the OAuth2 consent
//                           flow with the https://mail.google.com/ scope
//     GMAIL_SENDER_EMAIL  - the Gmail address these credentials belong to
//     GMAIL_SENDER_NAME   - optional display name for the `From` header
//
//   'smtp' - a plain SMTP relay (e.g. SendGrid, Amazon SES, a self-hosted
//   mail server). Required env vars:
//     SMTP_HOST, SMTP_PORT, SMTP_SECURE ('true'/'false'), SMTP_USER,
//     SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME (optional)
//
// Credentials are read from environment variables lazily (inside each call,
// with an optional per-call override), so a server without email
// configured can still boot - it only fails when sendEmail/verifyConnection
// is actually called. MailTransporters are cached per resolved config so
// connection pooling (SMTP) and Gmail's OAuth2 token refresh aren't redone
// on every send.
//
// Docs: https://nodemailer.com/about/
//       https://nodemailer.com/smtp/oauth2/#example-1-gmail

import nodemailer, { type Transporter } from "nodemailer";

// `createTransport` is overloaded per-transport-kind (SMTP, SMTP pool,
// sendmail, ...), each returning a differently-parameterized
// `Transporter<SentMessageInfo, Options>`. Deriving this type via
// `ReturnType<typeof nodemailer.createTransport>` binds to whichever single
// overload TS happens to resolve, which then mismatches the *other*
// overload's return type where it's actually used below (SMTP vs Gmail) -
// pinning both generics to `any` sidesteps that entirely, since we don't
// rely on SentMessageInfo/Options being any more specific than "whatever
// nodemailer gives back".
type MailTransporter = Transporter<any, any>;

export type EmailProvider = "gmail" | "smtp";

export interface GmailTransportConfig {
  provider: "gmail";
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  senderEmail: string;
  senderName?: string;
}

export interface SmtpTransportConfig {
  provider: "smtp";
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName?: string;
}

export type EmailConfig = GmailTransportConfig | SmtpTransportConfig;

/**
 * Optional per-call override of any config field. Both variants' fields are
 * available regardless of which `provider` ends up selected - each is
 * `Omit<..., "provider">` before intersecting, otherwise the two variants'
 * conflicting literal `provider` types would collapse the merged field to
 * `never` instead of the plain `EmailProvider` added back on below.
 */
export type EmailCredentialOverride = Partial<Omit<GmailTransportConfig, "provider">> &
  Partial<Omit<SmtpTransportConfig, "provider">> & {
    provider?: EmailProvider;
  };

/**
 * Thrown for any failure sending/verifying mail. `details` carries the
 * original error Nodemailer/the SMTP transport raised (which often has its
 * own `code`/`responseCode`/`command` fields worth inspecting) without this
 * module needing to know about every failure shape a transport can produce.
 */
export class EmailServiceError extends Error {
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = "EmailServiceError";
    this.details = details;
  }
}

function resolveConfig(overrides?: EmailCredentialOverride): EmailConfig {
  const provider: EmailProvider = overrides?.provider || (process.env.EMAIL_PROVIDER as EmailProvider) || "gmail";

  if (provider === "smtp") {
    const host = overrides?.host || process.env.SMTP_HOST;
    const port = Number(overrides?.port || process.env.SMTP_PORT || 587);
    const secure = overrides?.secure ?? (process.env.SMTP_SECURE === "true");
    const user = overrides?.user || process.env.SMTP_USER;
    const password = overrides?.password || process.env.SMTP_PASSWORD;
    const fromEmail = overrides?.fromEmail || process.env.SMTP_FROM_EMAIL || user;

    if (!host || !user || !password || !fromEmail) {
      throw new Error(
        "Missing SMTP credentials: configure SMTP_HOST / SMTP_USER / SMTP_PASSWORD / SMTP_FROM_EMAIL (or set EMAIL_PROVIDER=gmail).",
      );
    }

    return {
      provider: "smtp",
      host,
      port,
      secure,
      user,
      password,
      fromEmail,
      fromName: overrides?.fromName || process.env.SMTP_FROM_NAME || undefined,
    };
  }

  const clientId = overrides?.clientId || process.env.GMAIL_CLIENT_ID;
  const clientSecret = overrides?.clientSecret || process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = overrides?.refreshToken || process.env.GMAIL_REFRESH_TOKEN;
  const senderEmail = overrides?.senderEmail || process.env.GMAIL_SENDER_EMAIL;

  if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
    throw new Error(
      "Missing Gmail credentials: configure GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN / GMAIL_SENDER_EMAIL (or set EMAIL_PROVIDER=smtp).",
    );
  }

  return {
    provider: "gmail",
    clientId,
    clientSecret,
    refreshToken,
    senderEmail,
    senderName: overrides?.senderName || process.env.GMAIL_SENDER_NAME || undefined,
  };
}

// ---------------------------------------------------------------------------
// MailTransporter (cached per resolved config, so Gmail's OAuth2 token refresh
// and SMTP's connection pool are reused across calls instead of being
// rebuilt on every send).
// ---------------------------------------------------------------------------

const transporterCache = new Map<string, MailTransporter>();

function cacheKeyFor(config: EmailConfig): string {
  return config.provider === "gmail"
    ? `gmail:${config.senderEmail}:${config.refreshToken}`
    : `smtp:${config.host}:${config.port}:${config.user}`;
}

function buildMailTransporter(config: EmailConfig): MailTransporter {
  if (config.provider === "smtp") {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: config.senderEmail,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    },
  } as any);
}

function getMailTransporter(overrides?: EmailCredentialOverride): { transporter: MailTransporter; config: EmailConfig } {
  const config = resolveConfig(overrides);
  const key = cacheKeyFor(config);

  let transporter = transporterCache.get(key);
  if (!transporter) {
    transporter = buildMailTransporter(config);
    transporterCache.set(key, transporter);
  }
  return { transporter, config };
}

function defaultFrom(config: EmailConfig): string {
  return config.provider === "gmail"
    ? config.senderName
      ? `"${config.senderName}" <${config.senderEmail}>`
      : config.senderEmail
    : config.fromName
    ? `"${config.fromName}" <${config.fromEmail}>`
    : config.fromEmail;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

export interface EmailAttachment {
  filename: string;
  /** File bytes, a UTF-8 string, or a public URL Nodemailer will fetch. */
  content?: Buffer | string;
  /** Alternative to `content` - a local file path or URL for Nodemailer to read/fetch. */
  path?: string;
  /** e.g. "application/pdf", "image/png". Nodemailer infers this from `filename` when omitted. */
  contentType?: string;
  /** Set to attach inline (referenced via `cid:<contentId>` in the HTML body) instead of as a downloadable file. */
  cid?: string;
  encoding?: string;
}

export interface SendEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  /** Overrides the configured sender's display name/address for this send only. */
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Message-Id of the message being replied to, for In-Reply-To/References threading headers. */
  inReplyTo?: string;
  references?: string | string[];
  headers?: Record<string, string>;
  credentials?: EmailCredentialOverride;
}

export interface SendEmailResult {
  messageId: string;
  accepted: Array<string>;
  rejected: Array<string>;
  response?: string;
}

/**
 * Sends an email (plain text and/or HTML, with optional attachments/inline
 * images) through the configured provider. Nodemailer builds the MIME
 * message and handles the actual SMTP conversation, so callers just deal in
 * plain fields.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, cc, bcc, subject, text, html, from, replyTo, attachments, inReplyTo, references, headers, credentials } = params;

  if (!text && !html) {
    throw new Error("An email needs at least one of `text` or `html`.");
  }

  const { transporter, config } = getMailTransporter(credentials);

  try {
    const info = await transporter.sendMail({
      from: from || defaultFrom(config),
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      replyTo,
      attachments: attachments as any,
      inReplyTo,
      references,
      headers,
    } as any);

    return {
      messageId: info.messageId,
      accepted: (info.accepted || []) as string[],
      rejected: (info.rejected || []) as string[],
      response: info.response,
    };
  } catch (err: any) {
    throw new EmailServiceError(err?.message || "Failed to send email", err);
  }
}

/**
 * Sends the same email individually to each recipient (one `sendMail` call
 * per address, run sequentially) rather than putting them all in one `to`/
 * `bcc` list - useful for personalized bulk sends (e.g. a batch of ticket
 * reminders) without exposing the full recipient list to every mail server
 * along the way. Returns one result per recipient, in the same order,
 * capturing failures per-recipient instead of aborting the whole batch.
 */
export async function sendBulkEmails(
  recipients: string[],
  buildParams: (recipient: string) => Omit<SendEmailParams, "to">,
): Promise<Array<{ to: string; success: boolean; result?: SendEmailResult; error?: string }>> {
  const results: Array<{ to: string; success: boolean; result?: SendEmailResult; error?: string }> = [];

  for (const to of recipients) {
    try {
      const result = await sendEmail({ to, ...buildParams(to) });
      results.push({ to, success: true, result });
    } catch (err: any) {
      results.push({ to, success: false, error: err?.message || "Failed to send email" });
    }
  }

  return results;
}

/**
 * Verifies the configured transport can actually authenticate/connect -
 * useful as a startup/health check so a bad refresh token or SMTP
 * credential surfaces immediately instead of on the first real send.
 */
export async function verifyConnection(credentials?: EmailCredentialOverride): Promise<boolean> {
  const { transporter } = getMailTransporter(credentials);
  try {
    await transporter.verify();
    return true;
  } catch (err: any) {
    throw new EmailServiceError(err?.message || "Failed to verify email transport", err);
  }
}
