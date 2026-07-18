import streamifier from 'streamifier';
import { cloudinary } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

const hasCloudinaryConfiguration = (): boolean => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET,
);

export const uploadIssueImage = async (file: Express.Multer.File): Promise<string> => {
  if (!hasCloudinaryConfiguration()) {
    throw new ApiError(500, 'Cloudinary is not configured.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'janvoice-ai/issues', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(new ApiError(502, 'Image upload failed. Please try again.'));
        if (!result?.secure_url) return reject(new ApiError(502, 'Image upload did not return a URL.'));
        console.dir(result, { depth: null, maxStringLength: null });
        const secureUrl = result.secure_url;
        console.log('Cloudinary secure_url:', secureUrl);
        return resolve(secureUrl);
      },
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};
