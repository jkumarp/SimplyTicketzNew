import { Router } from 'express';
import { getUsers, createUser, signInUser, signOutUser } from '../controllers/userController';

const router = Router();

router.get('/users', getUsers);
router.post('/users', createUser);
router.post('/login', signInUser);
router.post('/logout', signOutUser);

export default router;