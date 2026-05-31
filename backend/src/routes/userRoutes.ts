import { Router } from 'express';
import { getUsers, setUser, signUp } from '../controllers/userController';

const router = Router();

router.get('/users', getUsers);
router.post('/users', signUp);
router.post('/users', setUser);

export default router;