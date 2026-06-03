import { Router } from 'express';
import { createTicketTimeslot, updateTicketTimeslot, getTicketTimeslots } from '../controllers/ticketTimeslotController';

const router = Router();

router.get('/ticket-timeslots', getTicketTimeslots);
router.post('/ticket-timeslots', createTicketTimeslot);
router.put('/ticket-timeslots/:id', updateTicketTimeslot);

export default router;