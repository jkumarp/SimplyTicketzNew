import { Router } from 'express';
import { getUsers, createUser, updateUser } from '../controllers/userController';
import { authorizeRoles } from '../middleware/authMiddleware';
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
router.get('/users', authorizeRoles(1, 2,3), getUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 */
router.post('/users', authorizeRoles(1, 2), createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update an existing user
 */
router.put('/users/:id', authorizeRoles(1, 2), updateUser);

export default router;