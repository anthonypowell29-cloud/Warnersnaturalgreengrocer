"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = require("cloudinary");
// Validate Cloudinary configuration
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
if (!cloudName || !apiKey || !apiSecret) {
    console.warn('⚠️  Cloudinary credentials not configured. Image uploads will fail.\n' +
        'Please set the following environment variables:\n' +
        '  - CLOUDINARY_CLOUD_NAME\n' +
        '  - CLOUDINARY_API_KEY\n' +
        '  - CLOUDINARY_API_SECRET\n' +
        'Get your credentials from: https://console.cloudinary.com/\n' +
        'Or check .env.sample for the format.');
}
cloudinary_1.v2.config({
    cloud_name: cloudName || '',
    api_key: apiKey || '',
    api_secret: apiSecret || '',
});
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinary.js.map