import { Router } from 'express';
import { getUsers, setUser } from '../controllers/userController';

const router = Router();

router.get('/users', getUsers);
router.post('/users', setUser);

export default router;