import { Router } from "express";
import {
    createUser,
    getUsers,
    getUsersByMerchantId,
    updateUser,refreshToken,
} from "../controllers/userController";
import { authorizeRoles } from "../middleware/authMiddleware";

import { apiRateLimiter } from "../middleware/rateLimitMiddleware";
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
router.get(
    "/users",
    authorizeRoles(1, 2, 3),
    apiRateLimiter(),
    getUsers,
);
router.get(
    "/merchant-users",
    authorizeRoles(1, 2, 3, 4, 5),
    apiRateLimiter(),
    getUsersByMerchantId,
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 */
router.post(
    "/users",
    authorizeRoles(1, 2),
    apiRateLimiter(),
    apiRateLimiter(),
    createUser,
);
router.post("/refresh-token", refreshToken);
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update an existing user
 */
router.put(
    "/users/:id",
    authorizeRoles(1, 2),
    apiRateLimiter(),
    apiRateLimiter(),
    updateUser,
);

export default router;
