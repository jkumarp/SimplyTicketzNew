import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, getSignedUrl, deleteDocument } from '../controllers/documentController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/signed-url', getSignedUrl);
router.delete('/delete', deleteDocument);

export default router;