import { Router } from 'express';
import { z } from 'zod';
import { createMerchantService, updateMerchantService, getMerchantServices, getMerchantServiceBookingCal, updateEncryptionKey } from '../controllers/merchantServicesController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const serviceFields = {
  merchant_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  logo_image_path: z.string().max(500).optional().nullable(),
  single_qr_sw: z.boolean().optional(),
  background_color: z.string().max(20).optional().nullable(),
  beneficiary_name: z.string().max(200).optional(),
  account_type: z.string().max(50).optional(),
  bank_account_number: z.string().max(30).optional(),
  bank_name: z.string().max(200).optional(),
  branch_name: z.string().max(200).optional(),
  bank_ifsc: z.string().max(15).optional(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  mon_working_sw: z.boolean().optional(),
  tue_working_sw: z.boolean().optional(),
  wed_working_sw: z.boolean().optional(),
  thu_working_sw: z.boolean().optional(),
  fri_working_sw: z.boolean().optional(),
  sat_working_sw: z.boolean().optional(),
  sun_working_sw: z.boolean().optional(),
  addressline1: z.string().max(255).optional(),
  addressline2: z.string().max(255).optional().nullable(),
  state: z.union([z.string(), z.number()]).optional(),
  pincode: z.string().max(10).optional(),
  country: z.union([z.string(), z.number()]).optional(),
  location_coordinates: z.string().optional().nullable(),
  encrypted_url: z.string().optional().nullable(),
  update_by: z.number().optional(),
  status_sw: z.boolean().optional(),
  sgst: z.number().min(0).max(100).optional(),
  cgst: z.number().min(0).max(100).optional(),
  igst: z.number().min(0).max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  recurring_sw: z.boolean().optional(),
  city: z.string().max(100).optional(),
  advance_booking_days: z.number().int().min(0).max(365).optional(),
};

const createServiceSchema = z.object({
  body: z.object(serviceFields),
});

const updateServiceSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object(
    Object.fromEntries(
      Object.entries(serviceFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ),
  ),
});

const encryptionKeySchema = z.object({
  params: z.object({ id: z.string() }),
});

const bookingCalSchema = z.object({
  query: z.object({
    serviceId: z.string().min(1),
  }),
});

const getServicesSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

// Role 7 (guest/customer) is included so an anonymous visitor landing
// directly on the public booking page (CustomerTicketBooking.tsx) can look
// up the service they're booking - getMerchantServices() restricts the
// columns it returns for that role so bank/encryption fields aren't exposed.
router.get('/merchant-services', authorizeRoles(1,2,3,4,5,6,7), validate(getServicesSchema),apiRateLimiter(), getMerchantServices);
router.put('/service-encryption/:id', authorizeRoles(1,2,3), validate(encryptionKeySchema),apiRateLimiter(), updateEncryptionKey);
router.get('/merchant-services/booking-calendar', authorizeRoles(1,2,3,4,5,6,7), validate(bookingCalSchema),apiRateLimiter(), getMerchantServiceBookingCal);
router.post('/merchant-services', authorizeRoles(1,2,3,4,5,6), validate(createServiceSchema),apiRateLimiter(), createMerchantService);
router.put('/merchant-services/:id', authorizeRoles(1,2,3,4,5,6), validate(updateServiceSchema),apiRateLimiter(), updateMerchantService);
// Note: a second `GET /merchant-services` route registered for
// getMerchantServicesTaxes used to live here, but Express only ever
// dispatches to the first matching route for a given method+path, so it was
// permanently unreachable dead code. Removed rather than silently ignored.

export default router;
