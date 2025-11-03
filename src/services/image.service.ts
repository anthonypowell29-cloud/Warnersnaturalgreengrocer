import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload image to Cloudinary
 */
export const uploadImage = async (
  file: Express.Multer.File,
  folder: string = 'jamaican-marketplace'
): Promise<UploadResult> => {
  // Check if Cloudinary is configured
  const config = cloudinary.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret || 
      config.cloud_name === '' || config.api_key === '' || config.api_secret === '') {
    throw new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file. ' +
      'Get your credentials from https://console.cloudinary.com/'
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          // Provide more helpful error messages
          let errorMessage = `Image upload failed: ${error.message}`;
          
          if (error.message.includes('Invalid api_key') || error.message.includes('api_key')) {
            errorMessage = 
              'Cloudinary API key is invalid. Please check your CLOUDINARY_API_KEY in .env file. ' +
              'Get your credentials from https://console.cloudinary.com/';
          } else if (error.message.includes('cloud_name')) {
            errorMessage = 
              'Cloudinary cloud name is invalid. Please check your CLOUDINARY_CLOUD_NAME in .env file.';
          } else if (error.message.includes('api_secret')) {
            errorMessage = 
              'Cloudinary API secret is invalid. Please check your CLOUDINARY_API_SECRET in .env file.';
          }
          
          reject(new Error(errorMessage));
          return;
        }

        if (!result || !result.secure_url) {
          reject(new Error('Image upload failed: No URL returned'));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

/**
 * Delete image from Cloudinary
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

