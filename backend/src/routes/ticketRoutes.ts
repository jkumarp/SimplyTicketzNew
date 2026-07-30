import { Router } from 'express';
import { z } from 'zod';
import { getTickets, createTicket, updateTicket, bookTicket, getTicketsByInvoiceId } from '../controllers/ticketController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const getTicketsSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    serviceId: z.string().optional(),
    customerPhone: z.string().max(20).optional(),
    search: z.string().max(100).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    pageSize: z.string().regex(/^\d+$/).optional(),
  }),
});

const byInvoiceSchema = z.object({
  query: z.object({
    invoiceId: z.string().optional(),
  }),
});

const createTicketSchema = z.object({
  body: z.object({
    merchant_id: z.number().int().positive(),
    merchant_service_id: z.number().int().positive(),
    ticket_category_id: z.number().int().positive(),
    ticket_timeslot_id: z.number().int().positive().optional().nullable(),
    booking_date: z.string().optional(),
    update_by: z.number().optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  }),
});

const updateTicketSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    ticket_category_id: z.number().int().positive().optional(),
    ticket_timeslot_id: z.number().int().positive().optional().nullable(),
    booking_date: z.string().optional(),
    update_by: z.number().optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  }),
});

const bookTicketSchema = z.object({
  body: z.object({
    // Walk-in/anonymous bookings don't always collect a phone number, so this
    // is optional - but if one is provided it must still look like a real
    // number. An empty string (what the walk-in booking UI sends today) is
    // treated the same as "not provided".
    customer_phone: z.string().trim().max(15).optional()
      .refine((v) => !v || v.length >= 6, { message: 'A valid phone number is required' }),
    // Frontend sends this as a number (e.g. 91) in some call sites; coerce so
    // both numeric and string phone codes validate correctly.
    customer_phone_code: z.coerce.string().max(5).optional(),
    merchant_id: z.number().int().positive(),
    merchant_service_id: z.number().int().positive(),
    email: z.string().trim().email().optional().or(z.literal('')),
    customer_name: z.string().trim().min(1, 'Customer name is required').max(200),
    payment_mode: z.string().min(1).max(50),
    categories: z.array(z.object({
      ticket_category_id: z.number().int().positive(),
      adult_count: z.number().int().min(0),
      child_count: z.number().int().min(0),
      booking_date: z.string().min(1, 'Booking date is required'),
      ticket_timeslot_id: z.number().int().positive().optional().nullable(),
    })).min(1, 'At least one ticket category is required'),
    update_by: z.number().optional(),
    voucher_code: z.string().max(10).optional().nullable(),
    grand_total: z.number().min(0).optional(),
    discount_value: z.number().min(0).optional(),
    total_amount: z.number().min(0).optional(),
    // See ticketController.bookTicket - true for the online customer
    // self-checkout flow, which must gate tickets behind a confirmed
    // payment gateway result before they're CONFIRMED.
    require_payment_confirmation: z.boolean().optional(),
  }),
});

router.get('/tickets', authorizeRoles(1,2,3,4,5,6,7), validate(getTicketsSchema),apiRateLimiter(), getTickets);
router.get('/tickets-by-invoiceId', authorizeRoles(1,2,3,4,5,6,7), validate(byInvoiceSchema),apiRateLimiter(), getTicketsByInvoiceId);
router.post('/tickets', authorizeRoles(1,2,3,4,5,6,7), validate(createTicketSchema),apiRateLimiter(), createTicket);
// Role 7 (guest/customer) included so a customer landing directly on the
// public booking page can complete a purchase without signing in first.
router.post('/tickets/book', authorizeRoles(1,2,3,4,5,6,7), validate(bookTicketSchema),apiRateLimiter(), bookTicket);
router.put('/tickets/:id', authorizeRoles(1,2,3,4,5), validate(updateTicketSchema),apiRateLimiter(), updateTicket);

export default router;
