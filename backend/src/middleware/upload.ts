import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (allowedMimeTypes.has(file.mimetype)) return callback(null, true);
    return callback(new ApiError(415, 'Only JPEG, PNG, and WebP image uploads are allowed.'));
  },
});
