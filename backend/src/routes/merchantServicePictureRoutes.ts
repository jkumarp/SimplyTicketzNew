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

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Picture Management
router.get('/merchant-service-pictures', authorizeRoles(1, 2, 3, 4, 5), getMerchantServicePictures);
router.post('/merchant-service-pictures', authorizeRoles(1, 2, 3, 4, 5), createMerchantServicePicture);
router.put('/merchant-service-pictures/:id', authorizeRoles(1, 2, 3, 4, 5), updateMerchantServicePicture);
router.delete('/merchant-service-pictures/:id', authorizeRoles(1, 2, 3, 4, 5), deleteMerchantServicePicture);

// File Operations
router.post('/merchant-service-pictures/upload', authorizeRoles(1, 2, 3, 4, 5), upload.single('file'), uploadServicePicture);
router.get('/merchant-service-pictures/url', authorizeRoles(1, 2, 3, 4, 5, 6, 7), getPictureUrl);

export default router;