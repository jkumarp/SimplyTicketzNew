import { Router } from 'express';
import { getUsers, createUser, updateUser } from '../controllers/userController';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Retrieve a list of users
 *     responses:
 *       200:
 *         description: A list of users.
 */
router.get('/users', getUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 */
router.post('/users', createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update an existing user
 */
router.put('/users/:id', updateUser);

export default router;