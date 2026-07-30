import { Router } from 'express';
import { z } from 'zod';
import { createTicketCategory, updateTicketCategory, getTicketCategories } from '../controllers/ticketCategoryController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const categoryFields = {
  merchant_service_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  timeslot_id: z.number().int().positive().optional().nullable(),
  total_ticket_count: z.number().int().min(0),
  age_restriction_sw: z.boolean().optional(),
  child_age_limit: z.number().int().min(0).max(120).optional().nullable(),
  free_age_limit: z.number().int().min(0).max(120).optional().nullable(),
  adult_price: z.number().min(0),
  child_price: z.number().min(0).optional(),
  special_instruction: z.string().max(1000).optional().nullable(),
  update_by: z.number().optional(),
  status_sw: z.boolean().optional(),
};

const createCategorySchema = z.object({
  body: z.object(categoryFields),
});

const updateCategorySchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object(
    Object.fromEntries(
      Object.entries(categoryFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ),
  ),
});

const getCategoriesSchema = z.object({
  query: z.object({
    merchantServiceId: z.string().optional(),
  }),
});

// Role 7 (guest/customer) included so the public booking page can list a
// service's ticket categories/pricing without requiring sign-in.
router.get('/ticket-categories', authorizeRoles(1,2,3,4,5,6,7), validate(getCategoriesSchema),apiRateLimiter(), getTicketCategories);
router.post('/ticket-categories', authorizeRoles(1,2,3,4,5,6), validate(createCategorySchema),apiRateLimiter(), createTicketCategory);
router.put('/ticket-categories/:id', authorizeRoles(1,2,3,4,5,6), validate(updateCategorySchema),apiRateLimiter(), updateTicketCategory);

export default router;
