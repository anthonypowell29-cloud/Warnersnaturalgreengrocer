"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = express_1.default.Router();
// Validation rules
const productValidation = [
    (0, express_validator_1.body)('title').trim().notEmpty().withMessage('Title is required'),
    (0, express_validator_1.body)('description').trim().notEmpty().withMessage('Description is required'),
    (0, express_validator_1.body)('category').isIn(['fruits', 'vegetables']).withMessage('Invalid category'),
    (0, express_validator_1.body)('price').isNumeric().withMessage('Price must be a number'),
    (0, express_validator_1.body)('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    (0, express_validator_1.body)('parish').trim().notEmpty().withMessage('Parish is required'),
    (0, express_validator_1.body)('latitude').isFloat().withMessage('Valid latitude is required'),
    (0, express_validator_1.body)('longitude').isFloat().withMessage('Valid longitude is required'),
];
// Public routes
router.get('/', product_controller_1.getProducts);
router.get('/search', product_controller_1.searchProducts);
router.get('/:id', product_controller_1.getProduct);
// Protected routes
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('farmer'), upload_middleware_1.upload.array('images', 5), // Max 5 images
productValidation, product_controller_1.createProduct);
router.put('/:id', auth_middleware_1.authenticate, upload_middleware_1.upload.array('images', 5), productValidation, product_controller_1.updateProduct);
router.delete('/:id', auth_middleware_1.authenticate, product_controller_1.deleteProduct);
// Seller routes
router.get('/seller/my-products', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('farmer'), product_controller_1.getMyProducts);
exports.default = router;
//# sourceMappingURL=product.routes.js.map