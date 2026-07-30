import { Router } from 'express';
import { z } from 'zod';
import { getMerchantEnquiries, createMerchantEnquiry, updateMerchantEnquiry } from '../controllers/merchantEnquiryController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";
import { verifyRecaptcha } from "../middleware/recaptchaMiddleware";

const router = Router();

const createEnquirySchema = z.object({
  body: z.object({
    merchant_name: z.string().trim().min(1, 'Name is required').max(200),
    merchant_email: z.string().trim().email('A valid email is required'),
    enquiry_details: z.string().trim().min(1, 'Enquiry details are required').max(2000),
    recaptchaToken: z.string().min(1, 'Please complete the "I am not a robot" verification'),
  }),
});

const updateEnquirySchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    status: z.enum(['Created', 'In Progress', 'On Hold', 'Closed']).optional(),
    admin_comments: z.string().trim().max(2000).optional().nullable(),
  }),
});

const getEnquiriesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.enum(['Created', 'In Progress', 'On Hold', 'Closed']).optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

// Public "contact us" form submission - rate limited + strictly validated
// since it accepts unauthenticated input.
router.post('/merchant-enquiries', apiRateLimiter(), validate(createEnquirySchema), verifyRecaptcha(), createMerchantEnquiry);

// Listing and updating enquiries exposes customer contact details and lets
// callers change enquiry status - this must be admin-only. Previously these
// had no auth at all, so anyone could read every enquiry or tamper with them.
router.get('/merchant-enquiries', authorizeRoles(1, 2, 3), validate(getEnquiriesSchema), apiRateLimiter(), getMerchantEnquiries);
router.put('/merchant-enquiries/:id', authorizeRoles(1, 2, 3), validate(updateEnquirySchema), apiRateLimiter(), updateMerchantEnquiry);

export default router;
