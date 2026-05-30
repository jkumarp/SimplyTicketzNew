import { Router } from 'express';
import { getUsers, setUsers } from '../controllers/userController';

const router = Router();

router.get('/users', getUsers);
router.post('/users', setUsers);

export default router;