import { Router } from 'express';
import { getTicketDetails, createTicketDetail, updateTicketDetail } from '../controllers/ticketDetailController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/ticket-details', authorizeRoles(1,2,3,4,5), getTicketDetails);
router.post('/ticket-details', authorizeRoles(1,2,3,4,5), createTicketDetail);
router.put('/ticket-details/:id', authorizeRoles(1,2,3,4,5), updateTicketDetail);

export default router;