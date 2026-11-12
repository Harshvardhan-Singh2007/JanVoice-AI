import streamifier from 'streamifier';
import { cloudinary } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

export interface UploadedIssueImage {
  secureUrl: string;
  publicId: string;
}

const hasCloudinaryConfiguration = (): boolean => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET,
);

export const uploadIssueImage = async (file: Express.Multer.File): Promise<UploadedIssueImage> => {
  if (!hasCloudinaryConfiguration()) {
    throw new ApiError(500, 'Cloudinary is not configured.');
  }

  return new Promise((resolve, reject) => {
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'janvoice-ai/issues', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(new ApiError(502, 'Image upload failed. Please try again.'));
          if (!result?.secure_url || !result.public_id) return reject(new ApiError(502, 'Image upload did not return a usable result.'));
          return resolve({ secureUrl: result.secure_url, publicId: result.public_id });
        },
      );

      const source = streamifier.createReadStream(file.buffer);
      source.on('error', () => uploadStream.destroy(new Error('Image stream failed.')));
      uploadStream.on('error', () => reject(new ApiError(502, 'Image upload failed. Please try again.')));
      source.pipe(uploadStream);
    } catch {
      reject(new ApiError(502, 'Image upload failed. Please try again.'));
    }
  });
};

export const deleteIssueImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch {
    // Cleanup is best-effort. Never log the Cloudinary response or private identifiers.
  }
};
