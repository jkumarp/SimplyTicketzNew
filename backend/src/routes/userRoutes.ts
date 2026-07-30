import { Router } from "express";
import { z } from "zod";
import {
    createUser,
    getUsers,
    getUsersByMerchantId,
    updateUser,refreshToken,
} from "../controllers/userController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";

import { apiRateLimiter } from "../middleware/rateLimitMiddleware";
const router = Router();

const merchantUsersSchema = z.object({
    query: z.object({
        merchantId: z.string().min(1, 'merchantId is required'),
    }),
});

const getUsersSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        pageSize: z.string().optional(),
    }),
});

const createUserSchema = z.object({
    body: z.object({
        email: z.string().trim().email('A valid email is required'),
        password: z.string().min(8, 'Password must be at least 8 characters').max(128),
        user_fname: z.string().trim().min(1, 'First name is required').max(100),
        user_mname: z.string().trim().max(100).optional().nullable(),
        user_lname: z.string().trim().min(1, 'Last name is required').max(100),
        phone: z.string().trim().min(6).max(15).optional(),
        user_type_id: z.number().int().positive(),
        merchant_id: z.number().int().positive().optional().nullable(),
    }),
});

const updateUserSchema = z.object({
    params: z.object({ id: z.string() }),
    body: z.object({
        user_fname: z.string().trim().min(1).max(100).optional(),
        user_mname: z.string().trim().max(100).optional().nullable(),
        user_lname: z.string().trim().min(1).max(100).optional(),
        phone: z.string().trim().min(6).max(15).optional(),
        phone_country_code: z.string().max(5).optional(),
        user_type_id: z.number().int().positive().optional(),
        merchant_id: z.number().int().positive().optional().nullable(),
        status_sw: z.boolean().optional(),
    }),
});

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
    validate(getUsersSchema),
    apiRateLimiter(),
    getUsers,
);
router.get(
    "/merchant-users",
    authorizeRoles(1, 2, 3, 4, 5),
    validate(merchantUsersSchema),
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
    validate(createUserSchema),
    apiRateLimiter(),
    createUser,
);
// Rate limited to slow down abuse of token minting via a stolen/expired token
router.post("/refresh-token", apiRateLimiter(), refreshToken);
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update an existing user
 */
router.put(
    "/users/:id",
    authorizeRoles(1, 2),
    validate(updateUserSchema),
    apiRateLimiter(),
    updateUser,
);

export default router;
