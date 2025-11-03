"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// Validation rules
const updateProfileValidation = [
    (0, express_validator_1.body)('displayName').optional().trim().notEmpty(),
    (0, express_validator_1.body)('phoneNumber').optional().trim(),
];
const addressValidation = [
    (0, express_validator_1.body)('street').trim().notEmpty().withMessage('Street is required'),
    (0, express_validator_1.body)('city').trim().notEmpty().withMessage('City is required'),
    (0, express_validator_1.body)('parish').trim().notEmpty().withMessage('Parish is required'),
    (0, express_validator_1.body)('postalCode').trim().notEmpty().withMessage('Postal code is required'),
    (0, express_validator_1.body)('isDefault').optional().isBoolean(),
];
// Routes
router.get('/profile', user_controller_1.getProfile);
router.put('/profile', updateProfileValidation, user_controller_1.updateProfile);
router.post('/upload-photo', upload_middleware_1.upload.single('photo'), user_controller_1.uploadPhoto);
router.post('/addresses', addressValidation, user_controller_1.addAddress);
router.put('/addresses/:addressId', addressValidation, user_controller_1.updateAddress);
router.delete('/addresses/:addressId', user_controller_1.deleteAddress);
exports.default = router;
//# sourceMappingURL=user.routes.js.map