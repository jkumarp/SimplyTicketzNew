import { Router } from 'express';
import { z } from 'zod';
import { createTicketTimeslot, updateTicketTimeslot, getTicketTimeslots, getTicketTimeslotsByService,getTicketTimeslotsByCategory } from '../controllers/ticketTimeslotController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const timeslotFields = {
  merchant_id: z.number().int().positive(),
  merchant_service_id: z.number().int().positive(),
  ticket_category_id: z.number().int().positive().optional().nullable(),
  name: z.string().trim().min(1).max(200),
  start: z.string().min(1),
  end: z.string().min(1),
  total_ticket_count: z.number().int().min(0),
  update_by: z.number().optional(),
  status_sw: z.boolean().optional(),
};

const createTimeslotSchema = z.object({
  body: z.object(timeslotFields),
});

const updateTimeslotSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object(
    Object.fromEntries(
      Object.entries(timeslotFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ),
  ),
});

const getTimeslotsSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
  }),
});

const byServiceSchema = z.object({
  query: z.object({
    serviceId: z.string().min(1),
  }),
});

const byCategorySchema = z.object({
  query: z.object({
    categoryId: z.string().min(1),
  }),
});

router.get('/ticket-timeslots', authorizeRoles(1,2,3,4,5,6,7), validate(getTimeslotsSchema),apiRateLimiter(), getTicketTimeslots);
// Role 7 (guest/customer) included so the public booking page can list a
// service's available timeslots without requiring sign-in.
router.get('/ticket-timeslots-by-service', authorizeRoles(1,2,3,4,5,6,7), validate(byServiceSchema),apiRateLimiter(), getTicketTimeslotsByService);
router.get('/ticket-timeslots-by-category', authorizeRoles(1,2,3,4,5,6,7), validate(byCategorySchema),apiRateLimiter(), getTicketTimeslotsByCategory);
router.post('/ticket-timeslots', authorizeRoles(1,2,3,4,5), validate(createTimeslotSchema),apiRateLimiter(), createTicketTimeslot);
router.put('/ticket-timeslots/:id', authorizeRoles(1,2,3,4,5), validate(updateTimeslotSchema),apiRateLimiter(), updateTicketTimeslot);

export default router;
