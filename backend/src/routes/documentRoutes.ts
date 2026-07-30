import { Router } from 'express';
import { z } from 'zod';
import { uploadDocument, getSignedUrl, deleteDocument } from '../controllers/documentController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { uploadDocumentFile } from '../middleware/upload';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

// Filenames are always server-generated as `${timestamp}-${rand}.${ext}`
// (see documentController.ts) - restricting to that exact shape blocks path
// traversal (`../`) and access to arbitrarily-named objects in the bucket.
const safeFilename = /^[0-9]+-[0-9]+\.[a-zA-Z0-9]{1,10}$/;

const signedUrlSchema = z.object({
  query: z.object({
    path: z.string().regex(safeFilename, 'Invalid file path'),
  }),
});

const deleteSchema = z.object({
  body: z.object({
    path: z.string().regex(safeFilename, 'Invalid file path'),
  }),
});

// These endpoints read/write merchant KYC documents, so they must be
// authenticated - previously anyone, unauthenticated, could upload, fetch a
// signed URL for, or delete any document in the bucket just by knowing (or
// guessing) its path.
router.post(
  '/upload',
  authorizeRoles(1, 2, 3, 4, 5, 6),
  apiRateLimiter(),
  uploadDocumentFile.single('file'),
  uploadDocument,
);
router.get(
  '/signed-url',
  authorizeRoles(1, 2, 3, 4, 5, 6),
  apiRateLimiter(),
  validate(signedUrlSchema),
  getSignedUrl,
);
router.delete(
  '/delete',
  authorizeRoles(1, 2, 3, 4, 5, 6),
  apiRateLimiter(),
  validate(deleteSchema),
  deleteDocument,
);

export default router;
