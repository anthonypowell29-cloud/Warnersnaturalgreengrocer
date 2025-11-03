export interface UploadResult {
    url: string;
    publicId: string;
}
/**
 * Upload image to Cloudinary
 */
export declare const uploadImage: (file: Express.Multer.File, folder?: string) => Promise<UploadResult>;
/**
 * Delete image from Cloudinary
 */
export declare const deleteImage: (publicId: string) => Promise<void>;
//# sourceMappingURL=image.service.d.ts.map