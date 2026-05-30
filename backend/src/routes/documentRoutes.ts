import { Router } from 'express';
import multer from 'multer';
import { uploadDocument } from '../controllers/documentController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadDocument);

export default router;