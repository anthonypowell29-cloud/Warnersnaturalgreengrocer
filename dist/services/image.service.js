"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteImage = exports.uploadImage = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
/**
 * Upload image to Cloudinary
 */
const uploadImage = async (file, folder = 'jamaican-marketplace') => {
    // Check if Cloudinary is configured
    const config = cloudinary_1.default.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret ||
        config.cloud_name === '' || config.api_key === '' || config.api_secret === '') {
        throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file. ' +
            'Get your credentials from https://console.cloudinary.com/');
    }
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.default.uploader.upload_stream({
            folder,
            resource_type: 'image',
            transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' },
            ],
        }, (error, result) => {
            if (error) {
                // Provide more helpful error messages
                let errorMessage = `Image upload failed: ${error.message}`;
                if (error.message.includes('Invalid api_key') || error.message.includes('api_key')) {
                    errorMessage =
                        'Cloudinary API key is invalid. Please check your CLOUDINARY_API_KEY in .env file. ' +
                            'Get your credentials from https://console.cloudinary.com/';
                }
                else if (error.message.includes('cloud_name')) {
                    errorMessage =
                        'Cloudinary cloud name is invalid. Please check your CLOUDINARY_CLOUD_NAME in .env file.';
                }
                else if (error.message.includes('api_secret')) {
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
        });
        uploadStream.end(file.buffer);
    });
};
exports.uploadImage = uploadImage;
/**
 * Delete image from Cloudinary
 */
const deleteImage = async (publicId) => {
    try {
        await cloudinary_1.default.uploader.destroy(publicId);
    }
    catch (error) {
        throw new Error(`Failed to delete image: ${error.message}`);
    }
};
exports.deleteImage = deleteImage;
//# sourceMappingURL=image.service.js.map