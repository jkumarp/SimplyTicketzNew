import { Router } from 'express';
import { getUsers, createUser, updateUser, signInUser, signOutUser } from '../controllers/userController';

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

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Authenticate a user and return a token
 */
router.post('/login', signInUser);

/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: Sign out the current user
 */
router.post('/logout', signOutUser);

export default router;