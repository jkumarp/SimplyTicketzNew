import { Router } from 'express';
import { 
  getMerchantServicePictures, 
  createMerchantServicePicture, 
  updateMerchantServicePicture, 
  deleteMerchantServicePicture 
} from '../controllers/merchantServicePictureController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-service-pictures', authorizeRoles(1, 2, 3, 4, 5), getMerchantServicePictures);
router.post('/merchant-service-pictures', authorizeRoles(1, 2, 3, 4, 5), createMerchantServicePicture);
router.put('/merchant-service-pictures/:id', authorizeRoles(1, 2, 3, 4, 5), updateMerchantServicePicture);
router.delete('/merchant-service-pictures/:id', authorizeRoles(1, 2, 3, 4, 5), deleteMerchantServicePicture);

export default router;