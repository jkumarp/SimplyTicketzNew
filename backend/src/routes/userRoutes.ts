import { Router } from 'express';
import { getUsers, createUser, updateUser, getUsersByMerchantId } from '../controllers/userController';
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
router.get('/merchant-users', authorizeRoles(1, 2,3,4,5), getUsersByMerchantId);

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