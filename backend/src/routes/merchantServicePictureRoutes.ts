import { Router } from 'express';
import multer from 'multer';
import { 
  getMerchantServicePictures, 
  createMerchantServicePicture, 
  updateMerchantServicePicture, 
  deleteMerchantServicePicture,
  uploadServicePicture,
  getPictureUrl
} from '../controllers/merchantServicePictureController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Picture Management
router.get('/merchant-service-pictures', authorizeRoles(1, 2, 3, 4, 5,6),apiRateLimiter(), getMerchantServicePictures);
router.post('/merchant-service-pictures', authorizeRoles(1, 2, 3, 4, 5,6),apiRateLimiter(), createMerchantServicePicture);
router.put('/merchant-service-pictures/:id', authorizeRoles(1, 2, 3, 4, 5,6),apiRateLimiter(), updateMerchantServicePicture);
router.delete('/merchant-service-pictures/:id', authorizeRoles(1, 2, 3, 4, 5,6),apiRateLimiter(), deleteMerchantServicePicture);

// File Operations
router.post('/merchant-service-pictures/upload', authorizeRoles(1, 2, 3, 4, 5,6), upload.single('file'),apiRateLimiter(), uploadServicePicture);
router.get('/merchant-service-pictures/url', authorizeRoles(1, 2, 3, 4, 5, 6, 7,6),apiRateLimiter(), getPictureUrl);

export default router;