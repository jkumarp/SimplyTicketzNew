import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import { logControllerError } from '../services/loggerService';
import * as paymentServices from '../services/paymentServices';
import * as easebuzz from '../services/easeBuzzPaymentService';
import { sendBookingConfirmationEmail, type InvoiceTicketSnapshot } from '../services/ticketEmailService';
import { sendBookingConfirmationWhatsApp } from '../services/ticketWhatsAppService';

// Where the customer's browser lands after a gateway checkout redirect, used
// as a fallback when the request has no Origin/Referer header to derive it
// from (e.g. Easebuzz's server-to-server POST to /payments/easebuzz-return).
// Matches the Vite dev server port from CLAUDE.md (`pnpm dev`, port 32109).
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:32109').replace(/\/$/, '');

/**
 * Flips every not-yet-CONFIRMED ticket tied to an invoice to CONFIRMED in a
 * single UPDATE. `.select('id')` lets callers tell a real PENDING->CONFIRMED
 * transition apart from a no-op (tickets were already confirmed) - only the
 * former should trigger the booking confirmation email, so a customer
 * refreshing the payment-result page or a duplicate gateway callback never
 * sends it twice.
 */
async function confirmInvoiceTickets(invoiceId: number | string) {
  return supabase
    .schema('transaction')
    .from('ticket')
    .update({ status: 'CONFIRMED', update_date: new Date().toISOString() })
    .eq('invoice_id', invoiceId)
    .neq('status', 'CONFIRMED')
    .select('id');
}

/**
 * Reads the invoice_json/ticket_json snapshot ticketController.bookTicket
 * wrote to transaction.ticket_invoice_json at booking time, so the
 * confirmation email/WhatsApp senders below can use it directly instead of
 * re-querying invoice/ticket/ticket_detail/category/timeslot/service.
 */
async function getInvoiceTicketSnapshot(invoiceId: number | string): Promise<InvoiceTicketSnapshot | null> {
  const { data, error } = await supabase
    .schema('transaction')
    .from('ticket_invoice_json')
    .select('invoice_json,ticket_json')
    .eq('invoice_id', invoiceId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as unknown as InvoiceTicketSnapshot;
}

/**
 * Sends the booking confirmation email/WhatsApp for an invoice using its
 * saved snapshot, without making the caller wait on it.
 */
async function sendBookingConfirmations(invoiceId: number | string): Promise<void> {
  const snapshot = await getInvoiceTicketSnapshot(invoiceId);
  if (!snapshot) {
    console.error(`[PaymentController] No invoice/ticket snapshot found for invoice #${invoiceId} - skipping confirmation email/WhatsApp.`);
    return;
  }
  void sendBookingConfirmationEmail(invoiceId, snapshot);
  void sendBookingConfirmationWhatsApp(invoiceId, snapshot);
}

function resolveFrontendOrigin(req: Request): string {
  const origin = req.headers.origin || req.headers.referer;
  if (typeof origin === 'string' && origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // fall through to default below
    }
  }
  return FRONTEND_URL;
}

/**
 * Creates a gateway checkout session/link for an already-created invoice
 * (see ticketController.bookTicket). The invoice's own merchant_id and
 * grand_total are used as the source of truth for who's being charged and
 * how much - never values passed in from the client.
 */
export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoice_id } = req.body;

    const { data: invoice, error } = await supabase
      .schema('transaction')
      .from('invoice')
      .select('*')
      .eq('id', invoice_id)
      .maybeSingle();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const grandTotal = parseFloat(invoice.grand_total);

    const checkout = await paymentServices.initiateGatewayPayment({
      merchantId: invoice.merchant_id,
      invoiceId: invoice.id,
      amount: grandTotal,
      currency: 'INR',
      paymentMethod: invoice.payment_mode,
      customer: {
        name: invoice.customer_name || 'Guest',
        email: invoice.email || undefined,
        phone: invoice.customer_phone || '9999999999',
      },
      frontendOrigin: resolveFrontendOrigin(req),
      backendBaseUrl: `${req.protocol}://${req.get('host')}/api`,
    });

    res.status(200).json({ success: true, data: checkout });
  } catch (err: any) {
    if (err instanceof paymentServices.PaymentGatewayError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    await logControllerError(req, err, 'PaymentController', 'initiatePayment');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Reports whether an invoice's tickets are paid/confirmed. Always trusts the
 * database first (cheap, and already updated by the Easebuzz return relay or
 * a prior call to this same endpoint); only falls through to an authoritative
 * gateway status check when a gateway/orderId/txnid was supplied and the
 * tickets aren't confirmed yet (the Cashfree redirect-back flow).
 */
export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId, orderId, txnid, gateway } = req.query;

    const { data: tickets, error: ticketsError } = await supabase
      .schema('transaction')
      .from('ticket')
      .select('id,status,merchant_id')
      .eq('invoice_id', invoiceId);

    if (ticketsError) {
      res.status(400).json({ error: ticketsError.message });
      return;
    }
    if (!tickets || tickets.length === 0) {
      res.status(404).json({ error: 'No tickets found for this invoice' });
      return;
    }

    if (tickets.every((t) => t.status === 'CONFIRMED')) {
      res.status(200).json({ success: true, paid: true });
      return;
    }

    const gatewayCode = typeof gateway === 'string' ? gateway : undefined;
    if (!gatewayCode) {
      res.status(200).json({ success: true, paid: false });
      return;
    }

    const result = await paymentServices.verifyGatewayPayment({
      merchantId: tickets[0].merchant_id,
      gatewayCode,
      orderId: typeof orderId === 'string' ? orderId : undefined,
      txnid: typeof txnid === 'string' ? txnid : undefined,
    });

    if (result.paid) {
      const { data: confirmedTickets, error: updateError } = await confirmInvoiceTickets(invoiceId as string);
      if (updateError) {
        res.status(400).json({ error: updateError.message });
        return;
      }
      // Only just now transitioned PENDING -> CONFIRMED (not a repeat check
      // on an already-confirmed invoice) - send the confirmation email
      // without making the caller wait on it.
      if (confirmedTickets && confirmedTickets.length > 0) {
        void sendBookingConfirmations(invoiceId as string);
      }
    }

    res.status(200).json({ success: true, paid: result.paid, rawStatus: result.rawStatus });
  } catch (err: any) {
    if (err instanceof paymentServices.PaymentGatewayError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    await logControllerError(req, err, 'PaymentController', 'getPaymentStatus');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Easebuzz's surl/furl target (see paymentServices.initiateGatewayPayment) -
 * Easebuzz POSTs the payment result here as form data. Verifies the response
 * hash with the same merchant-specific salt the payment was initiated with,
 * flips the invoice's tickets to CONFIRMED on success, then redirects the
 * browser on to the frontend result page (a plain GET, so the SPA can render
 * it normally).
 */
export const easebuzzReturn = async (req: Request, res: Response): Promise<void> => {
  const body = req.body || {};
  const invoiceId = body.udf1;
  const merchantId = Number(body.udf2);

  try {
    if (!invoiceId || !merchantId) {
      res.redirect(302, `${FRONTEND_URL}/payment-result/0?gateway=EASEBUZZ&status=failed`);
      return;
    }

    let verified = false;
    try {
      const { mapping } = await paymentServices.decidePaymentGateway(merchantId);
      verified = easebuzz.verifyResponseHash(body, mapping.encryption_key);
    } catch {
      verified = false;
    }

    const success = verified && String(body.status).toLowerCase() === 'success';

    if (success) {
      const { data: confirmedTickets, error } = await confirmInvoiceTickets(invoiceId);
      if (error) {
        await logControllerError(req, new Error(error.message), 'PaymentController', 'easebuzzReturn');
      } else if (confirmedTickets && confirmedTickets.length > 0) {
        void sendBookingConfirmations(invoiceId);
      }
    }

    const txnidParam = body.txnid ? `&txnid=${encodeURIComponent(body.txnid)}` : '';
    res.redirect(302, `${FRONTEND_URL}/payment-result/${invoiceId}?gateway=EASEBUZZ&status=${success ? 'success' : 'failed'}${txnidParam}`);
  } catch (err: any) {
    await logControllerError(req, err, 'PaymentController', 'easebuzzReturn');
    res.redirect(302, `${FRONTEND_URL}/payment-result/${invoiceId || 0}?gateway=EASEBUZZ&status=failed`);
  }
};
