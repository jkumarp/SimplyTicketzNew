import { Router } from 'express';
import { getTicketDetails, createTicketDetail, updateTicketDetail } from '../controllers/ticketDetailController';

const router = Router();

router.get('/ticket-details', getTicketDetails);
router.post('/ticket-details', createTicketDetail);
router.put('/ticket-details/:id', updateTicketDetail);

export default router;