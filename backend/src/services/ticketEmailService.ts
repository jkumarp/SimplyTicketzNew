// services/ticketEmailService.ts
//
// Sends the "booking confirmed" email - invoice summary plus one QR ticket
// per transaction.ticket_detail row - once a customer's online payment has
// actually been confirmed. Built on top of emailService.ts (Nodemailer); the
// only thing specific to this module is assembling the ticket/invoice data
// and rendering it as an email.
//
// Triggered from paymentController.ts right after confirmInvoiceTickets()
// flips an invoice's tickets to CONFIRMED (both the Cashfree
// getPaymentStatus verify path and the Easebuzz return relay) - never
// before payment is confirmed, and never for staff-assisted bookings
// (those are CONFIRMED immediately and have no gateway payment to wait on,
// so this is only wired into the online customer-checkout flow).
//
// The invoice/ticket data is not re-queried here - paymentController.ts
// passes the invoice_json/ticket_json snapshot it read from
// transaction.ticket_invoice_json (written once, at booking time, by
// ticketController.bookTicket), so this module never re-hits invoice,
// ticket, ticket_detail, ticket_category, ticket_timeslot, or
// merchant_service.

import QRCode from "qrcode";
import { sendEmail, type EmailAttachment } from "./emailService";
import { logError } from "./loggerService";

interface TicketDetailJson {
  id: number;
  ticket_number: string | null;
  qr_code_string: string;
  adult_count: number;
  child_count: number;
}

interface TimeslotJson {
  name: string;
  start: string;
  end: string;
}

interface TicketJsonEntry {
  ticket_id: number;
  ticket_category_id: number | null;
  category_name: string | null;
  ticket_timeslot_id: number | null;
  timeslot: TimeslotJson | null;
  booking_date: string;
  details: TicketDetailJson[];
}

export interface InvoiceTicketSnapshot {
  invoice_json: Record<string, any>;
  ticket_json: TicketJsonEntry[];
}

/** Renders one ticket_detail row's QR code to a PNG buffer, ready to attach inline. */
async function renderQrPng(qrCodeString: string): Promise<Buffer> {
  return QRCode.toBuffer(qrCodeString, { type: "png", width: 240, margin: 1 });
}

function formatMoney(value: unknown): string {
  const num = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  return `Rs. ${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds and sends the booking confirmation email for an invoice whose
 * tickets have just been confirmed. Never throws - a failure here (missing
 * email, SMTP outage, etc.) is logged and swallowed rather than surfaced to
 * the caller, since it must never block or fail the payment-confirmation
 * response/redirect that triggered it.
 */
export async function sendBookingConfirmationEmail(
  invoiceId: number | string,
  snapshot: InvoiceTicketSnapshot,
): Promise<void> {
  try {
    const invoice = snapshot?.invoice_json;
    const ticketEntries = snapshot?.ticket_json;

    if (!invoice || !Array.isArray(ticketEntries) || ticketEntries.length === 0) {
      console.error(`[ticketEmailService] Missing invoice/ticket snapshot for invoice #${invoiceId}`);
      return;
    }
    if (!invoice.email) {
      // No email on file for this booking (customer left it blank) - nothing to send to.
      return;
    }

    const serviceName = invoice.service?.name || "Your Booking";
    const serviceAddress = [invoice.service?.addressline1, invoice.service?.addressline2].filter(Boolean).join(", ");

    // One QR PNG per ticket_detail row, attached inline (cid) and referenced
    // from the matching <img> in the HTML body below - this is the actual
    // scannable code stored at booking time (transaction.ticket_detail.qr_code_string),
    // not a re-derived one.
    const attachments: EmailAttachment[] = [];
    const ticketCardsHtml: string[] = [];
    const ticketLinesText: string[] = [];

    for (const ticket of ticketEntries) {
      const bookingDate = ticket.booking_date ? String(ticket.booking_date).split("T")[0] : "";
      const slotLabel = ticket.timeslot ? `${ticket.timeslot.name} (${ticket.timeslot.start}-${ticket.timeslot.end})` : "";

      for (const detail of ticket.details || []) {
        const cid = `qr-${detail.id}@simplyticketz`;

        try {
          attachments.push({
            filename: `${detail.ticket_number || `ticket-${detail.id}`}.png`,
            content: await renderQrPng(detail.qr_code_string),
            contentType: "image/png",
            cid,
          });
        } catch (qrErr) {
          console.error(`[ticketEmailService] Failed to render QR for ticket_detail #${detail.id}:`, qrErr);
          continue;
        }

        const partyLabel = [
          detail.adult_count ? `${detail.adult_count} Adult${detail.adult_count > 1 ? "s" : ""}` : null,
          detail.child_count ? `${detail.child_count} Child${detail.child_count > 1 ? "ren" : ""}` : null,
        ].filter(Boolean).join(" + ");

        ticketCardsHtml.push(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;margin:0 0 16px 0;">
          <tr>
            <td style="padding:16px;vertical-align:top;">
              <div style="font-size:15px;font-weight:700;color:#1e293b;">${escapeHtml(ticket.category_name || "Ticket")}</div>
              <div style="font-size:12px;color:#4f46e5;font-weight:700;margin-top:2px;">${escapeHtml(partyLabel)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:8px;">Date of Visit: <strong>${escapeHtml(bookingDate)}</strong></div>
              ${slotLabel ? `<div style="font-size:12px;color:#64748b;">Time Slot: <strong>${escapeHtml(slotLabel)}</strong></div>` : ""}
              <div style="font-size:11px;color:#94a3b8;margin-top:8px;font-family:monospace;">Ticket #${escapeHtml(detail.ticket_number || detail.id)}</div>
            </td>
            <td style="padding:16px;width:120px;text-align:center;">
              <img src="cid:${cid}" width="110" height="110" alt="Ticket QR code" style="display:block;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;" />
            </td>
          </tr>
        </table>`);

        ticketLinesText.push(
          `- ${ticket.category_name || "Ticket"} (${partyLabel || "-"}) | ${bookingDate}${slotLabel ? ` | ${slotLabel}` : ""} | Ticket #${detail.ticket_number || detail.id}`,
        );
      }
    }

    if (attachments.length === 0) {
      console.error(`[ticketEmailService] No QR codes could be rendered for invoice #${invoiceId} - skipping email.`);
      return;
    }

    const subtotal = formatMoney(invoice.total_amount);
    const discount = parseFloat(invoice.discount_value || 0);
    const sgst = parseFloat(invoice.sgst || 0);
    const cgst = parseFloat(invoice.cgst || 0);
    const igst = parseFloat(invoice.igst || 0);
    const grandTotal = formatMoney(invoice.grand_total);

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
        <div style="background:#4f46e5;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:20px;">Payment Successful - Booking Confirmed!</h1>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:14px;">Hi ${escapeHtml(invoice.customer_name || "there")},</p>
          <p style="font-size:14px;">
            Your payment for <strong>${escapeHtml(serviceName)}</strong>${serviceAddress ? ` (${escapeHtml(serviceAddress)})` : ""}
            has been received and your tickets are confirmed. Your invoice and tickets (with QR codes) are below -
            please present the relevant QR code at entry.
          </p>

          <h2 style="font-size:14px;margin:24px 0 8px;">Invoice ${escapeHtml(invoice.invoice_number)}</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#64748b;">Subtotal</td><td style="padding:4px 0;text-align:right;">${subtotal}</td></tr>
            ${discount > 0 ? `<tr><td style="padding:4px 0;color:#059669;">Discount</td><td style="padding:4px 0;text-align:right;color:#059669;">-${formatMoney(discount)}</td></tr>` : ""}
            ${sgst > 0 ? `<tr><td style="padding:4px 0;color:#64748b;">SGST</td><td style="padding:4px 0;text-align:right;">${sgst}%</td></tr>` : ""}
            ${cgst > 0 ? `<tr><td style="padding:4px 0;color:#64748b;">CGST</td><td style="padding:4px 0;text-align:right;">${cgst}%</td></tr>` : ""}
            ${igst > 0 ? `<tr><td style="padding:4px 0;color:#64748b;">IGST</td><td style="padding:4px 0;text-align:right;">${igst}%</td></tr>` : ""}
            <tr><td style="padding:8px 0;font-weight:700;border-top:1px solid #e2e8f0;">Grand Total</td><td style="padding:8px 0;text-align:right;font-weight:700;border-top:1px solid #e2e8f0;">${grandTotal}</td></tr>
          </table>
          <p style="font-size:12px;color:#94a3b8;">Payment Mode: ${escapeHtml(invoice.payment_mode || "-")}</p>

          <h2 style="font-size:14px;margin:24px 0 8px;">Your Tickets</h2>
          ${ticketCardsHtml.join("")}

          <p style="font-size:12px;color:#94a3b8;margin-top:24px;">
            You can also view, download, or print your tickets and invoice online at any time.
          </p>
        </div>
      </div>`;

    const text = [
      `Payment Successful - Booking Confirmed!`,
      ``,
      `Hi ${invoice.customer_name || "there"},`,
      `Your payment for ${serviceName} has been received and your tickets are confirmed.`,
      ``,
      `Invoice ${invoice.invoice_number}`,
      `Subtotal: ${subtotal}`,
      discount > 0 ? `Discount: -${formatMoney(discount)}` : null,
      `Grand Total: ${grandTotal}`,
      `Payment Mode: ${invoice.payment_mode || "-"}`,
      ``,
      `Your Tickets:`,
      ...ticketLinesText,
    ].filter((line): line is string => line !== null).join("\n");

    await sendEmail({
      to: invoice.email,
      subject: `Booking Confirmed - Tickets & Invoice ${invoice.invoice_number}`,
      html,
      text,
      attachments,
    });
  } catch (err: any) {
    console.error(`[ticketEmailService] Failed to send confirmation email for invoice #${invoiceId}:`, err);
    try {
      await logError({
        level: "ERROR",
        module: "TicketEmailService",
        function_name: "sendBookingConfirmationEmail",
        error_message: err?.message || "Unknown error",
        stack_trace: err?.stack,
      });
    } catch (logErr) {
      // logError() itself already reports its own insert failures now
      // (see loggerService.ts) - this only catches logError throwing
      // outright (e.g. a network error reaching Supabase).
      console.error(`[ticketEmailService] Failed to write audit log for invoice #${invoiceId}:`, logErr);
    }
  }
}
