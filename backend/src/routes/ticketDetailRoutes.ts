import { Router } from 'express';
import { getTicketDetails, createTicketDetail, updateTicketDetail, getTicketDetailByMerchantId } from '../controllers/ticketDetailController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/ticket-details', authorizeRoles(1,2,3,4,5),apiRateLimiter(), getTicketDetails);
router.get('/ticket-details-by-merchantid', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), getTicketDetailByMerchantId);
router.post('/ticket-details', authorizeRoles(1,2,3,4,5),apiRateLimiter(), createTicketDetail);
router.put('/ticket-details/:id', authorizeRoles(1,2,3,4,5),apiRateLimiter(), updateTicketDetail);

export default router;