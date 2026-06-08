import { Router } from 'express';
import { createTicketTimeslot, updateTicketTimeslot, getTicketTimeslots, getTicketTimeslotsByService,getTicketTimeslotsByCategory } from '../controllers/ticketTimeslotController';

const router = Router();

router.get('/ticket-timeslots', getTicketTimeslots);
router.get('/ticket-timeslots-by-service', getTicketTimeslotsByService);
router.get('/ticket-timeslots-by-category', getTicketTimeslotsByCategory);
router.post('/ticket-timeslots', createTicketTimeslot);
router.put('/ticket-timeslots/:id', updateTicketTimeslot);

export default router;