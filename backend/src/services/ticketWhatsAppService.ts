// services/ticketWhatsAppService.ts
//
// Sends the "booking confirmed" WhatsApp message once a customer's online
// payment has actually been confirmed - one ticket_booking_confirmation
// template message per transaction.ticket_detail row, combining the
// invoice summary and that ticket's QR code (as the header image) in a
// single message. Mirrors ticketEmailService.ts's data assembly, but
// renders it as a pre-approved WhatsApp template instead of an email.
//
// This MUST be sent as a message template, not a free-form text/image
// message: this is a business-initiated message (the customer hasn't
// necessarily messaged the business number first), and WhatsApp's Cloud API
// only allows free-form messages within the 24-hour window after the
// customer's last message. Sending free-form here would fail with error
// 131047 for any customer contacting the business for the first time - see
// whatsAppService.ts's sendTemplateMessage doc comment.
//
// The template (see WHATSAPP_TICKET_TEMPLATE below) must exist and be
// APPROVED in WhatsApp Manager before this will work. Until approved, sends
// fail and are logged (never thrown - see the try/catch around each send
// below). Expected shape:
//   Category: UTILITY, Header: dynamic Image.
//   Body: "Hi {{1}}, your payment for {{2}} is confirmed! ✅\n\nInvoice: {{3}}\nGrand Total: {{4}}\n\n🎫 {{5}} — {{6}}\nDate: {{7}}\nTicket No: {{8}}\n\nPlease show this QR code at entry."
//   Footer: "SimplyTicketz"
//
// Triggered from paymentController.ts right alongside sendBookingConfirmationEmail,
// i.e. after confirmInvoiceTickets() flips an invoice's tickets to CONFIRMED
// (both the Cashfree getPaymentStatus verify path and the Easebuzz return relay).
//
// Only sends if the invoice actually has a customer_phone on file - a
// booking made without a phone number silently skips WhatsApp, same as the
// email path silently skips when there's no email on file.
//
// The invoice/ticket data is not re-queried here - paymentController.ts
// passes the invoice_json/ticket_json snapshot it read from
// transaction.ticket_invoice_json (written once, at booking time, by
// ticketController.bookTicket), so this module never re-hits invoice,
// ticket, ticket_detail, ticket_category, ticket_timeslot, or
// merchant_service.

import QRCode from "qrcode";
import {
  normalizePhoneNumber,
  uploadMedia,
  sendTemplateMessage,
  WhatsAppApiError,
} from "./whatsAppService";
import { logError } from "./loggerService";
import type { InvoiceTicketSnapshot } from "./ticketEmailService";

const TICKET_TEMPLATE = process.env.WHATSAPP_TICKET_TEMPLATE || "ticket_booking_confirmation";
const TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";

async function renderQrPng(qrCodeString: string): Promise<Buffer> {
  return QRCode.toBuffer(qrCodeString, { type: "png", width: 240, margin: 1 });
}

function formatMoney(value: unknown): string {
  const num = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  return `Rs. ${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
}

/**
 * Builds and sends the booking confirmation WhatsApp message(s) for an
 * invoice whose tickets have just been confirmed. Never throws - a failure
 * here (missing phone, WhatsApp not configured, Meta API error, etc.) is
 * logged and swallowed rather than surfaced to the caller, since it must
 * never block or fail the payment-confirmation response/redirect that
 * triggered it.
 */
export async function sendBookingConfirmationWhatsApp(
  invoiceId: number | string,
  snapshot: InvoiceTicketSnapshot,
): Promise<void> {
  try {
    const invoice = snapshot?.invoice_json;
    const ticketEntries = snapshot?.ticket_json;

    if (!invoice || !Array.isArray(ticketEntries) || ticketEntries.length === 0) {
      console.error(`[ticketWhatsAppService] Missing invoice/ticket snapshot for invoice #${invoiceId}`);
      return;
    }
    if (!invoice.customer_phone) {
      // No phone number on file for this booking - nothing to send to.
      return;
    }

    const serviceName = invoice.service?.name || "Your Booking";
    const to = normalizePhoneNumber(invoice.customer_phone, invoice.customer_phone_code || 91);
    const grandTotal = formatMoney(invoice.grand_total);

    for (const ticket of ticketEntries) {
      const bookingDate = ticket.booking_date ? String(ticket.booking_date).split("T")[0] : "";
      const slotLabel = ticket.timeslot ? `${ticket.timeslot.name} (${ticket.timeslot.start}-${ticket.timeslot.end})` : "";
      const dateLabel = slotLabel ? `${bookingDate} | ${slotLabel}` : bookingDate;

      for (const detail of ticket.details || []) {
        const partyLabel = [
          detail.adult_count ? `${detail.adult_count} Adult${detail.adult_count > 1 ? "s" : ""}` : null,
          detail.child_count ? `${detail.child_count} Child${detail.child_count > 1 ? "ren" : ""}` : null,
        ].filter(Boolean).join(" + ") || "-";

        try {
          const png = await renderQrPng(detail.qr_code_string);
          const { mediaId } = await uploadMedia({
            file: png,
            filename: `${detail.ticket_number || `ticket-${detail.id}`}.png`,
            mimeType: "image/png",
          });

          await sendTemplateMessage({
            to,
            templateName: TICKET_TEMPLATE,
            languageCode: TEMPLATE_LANGUAGE,
            components: [
              {
                type: "header",
                parameters: [{ type: "image", image: { id: mediaId } }],
              },
              {
                type: "body",
                parameters: [
                  { type: "text", text: invoice.customer_name || "there" },
                  { type: "text", text: serviceName },
                  { type: "text", text: invoice.invoice_number },
                  { type: "text", text: grandTotal },
                  { type: "text", text: ticket.category_name || "Ticket" },
                  { type: "text", text: partyLabel },
                  { type: "text", text: dateLabel },
                  { type: "text", text: String(detail.ticket_number || detail.id) },
                ],
              },
            ],
          });
        } catch (err) {
          logSendFailure(err, invoiceId, `booking confirmation template for ticket_detail #${detail.id}`);
        }
      }
    }
  } catch (err: any) {
    console.error(`[ticketWhatsAppService] Failed to send confirmation WhatsApp message for invoice #${invoiceId}:`, err);
    try {
      await logError({
        level: "ERROR",
        module: "TicketWhatsAppService",
        function_name: "sendBookingConfirmationWhatsApp",
        error_message: err?.message || "Unknown error",
        stack_trace: err?.stack,
      });
    } catch (logErr) {
      console.error(`[ticketWhatsAppService] Failed to write audit log for invoice #${invoiceId}:`, logErr);
    }
  }
}

function logSendFailure(err: unknown, invoiceId: number | string, what: string): void {
  if (err instanceof WhatsAppApiError) {
    const subcode = err.details?.error?.error_subcode;
    console.error(`[ticketWhatsAppService] WhatsApp send failed (${what}) for invoice #${invoiceId}: [${err.code}${subcode ? `/${subcode}` : ""}] ${err.message}`);
  } else {
    console.error(`[ticketWhatsAppService] WhatsApp send failed (${what}) for invoice #${invoiceId}:`, err);
  }
}
