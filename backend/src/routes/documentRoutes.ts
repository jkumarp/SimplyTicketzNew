import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, getSignedUrl, deleteDocument } from '../controllers/documentController';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'),apiRateLimiter(), uploadDocument);
router.get('/signed-url',apiRateLimiter(), getSignedUrl);
router.delete('/delete',apiRateLimiter(), deleteDocument);

export default router;