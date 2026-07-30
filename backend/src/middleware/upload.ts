import multer from "multer";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const makeUploader = (allowedMimeTypes: Set<string>) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        cb(Object.assign(new Error("Unsupported file type"), { statusCode: 400 }));
        return;
      }
      cb(null, true);
    },
  });

// KYC / merchant documents: PDFs and images
export const uploadDocumentFile = makeUploader(ALLOWED_DOCUMENT_MIME_TYPES);

// Service/merchant pictures: images only
export const uploadImageFile = makeUploader(ALLOWED_IMAGE_MIME_TYPES);
