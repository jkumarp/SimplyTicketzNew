import { Router } from 'express';
import { z } from 'zod';
import { getTicketDetails, createTicketDetail, updateTicketDetail, getTicketDetailByMerchantId } from '../controllers/ticketDetailController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const detailFields = {
  ticket_id: z.number().int().positive(),
  ticket_category_id: z.number().int().positive(),
  ticket_number: z.string().min(1).max(255),
  qr_code_string: z.string().min(1),
  scanned_sw: z.boolean().optional(),
  scanned_time: z.string().optional().nullable(),
  adult_count: z.number().int().min(0),
  child_count: z.number().int().min(0),
  update_by: z.number().optional(),
};

const createDetailSchema = z.object({
  body: z.object(detailFields),
});

const updateDetailSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object(
    Object.fromEntries(
      Object.entries(detailFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ),
  ),
});

const byMerchantSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    userId: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

router.get('/ticket-details', authorizeRoles(1,2,3,4,5,6,7),apiRateLimiter(), getTicketDetails);
router.get('/ticket-details-by-merchantid', authorizeRoles(1,2,3,4,5,6,7), validate(byMerchantSchema),apiRateLimiter(), getTicketDetailByMerchantId);
router.post('/ticket-details', authorizeRoles(1,2,3,4,5,6,7), validate(createDetailSchema),apiRateLimiter(), createTicketDetail);
router.put('/ticket-details/:id', authorizeRoles(1,2,3,4,5), validate(updateDetailSchema),apiRateLimiter(), updateTicketDetail);

export default router;
