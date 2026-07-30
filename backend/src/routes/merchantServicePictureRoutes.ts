import { Router } from 'express';
import { z } from 'zod';
import {
  getMerchantServicePictures,
  createMerchantServicePicture,
  updateMerchantServicePicture,
  deleteMerchantServicePicture,
  uploadServicePicture,
  getPictureUrl
} from '../controllers/merchantServicePictureController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { uploadImageFile } from '../middleware/upload';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

// Filenames are always server-generated as `${timestamp}-${rand}.${ext}`
const safeFilename = /^[0-9]+-[0-9]+\.[a-zA-Z0-9]{1,10}$/;

const pictureUrlSchema = z.object({
  query: z.object({
    path: z.string().regex(safeFilename, 'Invalid file path'),
  }),
});

const createPictureSchema = z.object({
  body: z.object({
    merchant_id: z.number().int().positive(),
    service_id: z.number().int().positive(),
    category_id: z.number().int().positive().optional(),
    picture_id: z.string().regex(safeFilename, 'Invalid file path'),
    status_sw: z.boolean().optional(),
  }),
});

const updatePictureSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    merchant_id: z.number().int().positive().optional(),
    service_id: z.number().int().positive().optional(),
    category_id: z.number().int().positive().optional(),
    picture_id: z.string().regex(safeFilename, 'Invalid file path').optional(),
    status_sw: z.boolean().optional(),
  }),
});

const listPicturesSchema = z.object({
  query: z.object({
    serviceId: z.string().optional(),
    categoryId: z.string().optional(),
  }),
});

// Picture Management
router.get('/merchant-service-pictures', authorizeRoles(1, 2, 3, 4, 5, 6), validate(listPicturesSchema), apiRateLimiter(), getMerchantServicePictures);
router.post('/merchant-service-pictures', authorizeRoles(1, 2, 3, 4, 5, 6), validate(createPictureSchema), apiRateLimiter(), createMerchantServicePicture);
router.put('/merchant-service-pictures/:id', authorizeRoles(1, 2, 3, 4, 5, 6), validate(updatePictureSchema), apiRateLimiter(), updateMerchantServicePicture);
router.delete('/merchant-service-pictures/:id', authorizeRoles(1, 2, 3, 4, 5, 6), apiRateLimiter(), deleteMerchantServicePicture);

// File Operations
router.post('/merchant-service-pictures/upload', authorizeRoles(1, 2, 3, 4, 5, 6), apiRateLimiter(), uploadImageFile.single('file'), uploadServicePicture);
router.get('/merchant-service-pictures/url', authorizeRoles(1, 2, 3, 4, 5, 6, 7), validate(pictureUrlSchema), apiRateLimiter(), getPictureUrl);

export default router;