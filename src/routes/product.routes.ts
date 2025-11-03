import express from 'express';
import { body } from 'express-validator';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  searchProducts,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();

// Validation rules
const productValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['fruits', 'vegetables']).withMessage('Invalid category'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('parish').trim().notEmpty().withMessage('Parish is required'),
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required'),
];

// Public routes (with caching for better performance)
router.get('/', cacheMiddleware({ ttl: 120 }), getProducts); // 2 min cache
router.get('/search', cacheMiddleware({ ttl: 60 }), searchProducts); // 1 min cache
router.get('/:id', cacheMiddleware({ ttl: 300 }), getProduct); // 5 min cache

// Protected routes
router.post(
  '/',
  authenticate,
  authorize('farmer'),
  upload.array('images', 5), // Max 5 images
  productValidation,
  createProduct
);

router.put(
  '/:id',
  authenticate,
  upload.array('images', 5),
  productValidation,
  updateProduct
);

router.delete('/:id', authenticate, deleteProduct);

// Seller routes
router.get('/seller/my-products', authenticate, authorize('farmer'), getMyProducts);

export default router;

