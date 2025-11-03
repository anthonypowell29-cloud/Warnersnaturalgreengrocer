import express from 'express';
import { body } from 'express-validator';
import {
  getProfile,
  updateProfile,
  uploadPhoto,
  addAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const updateProfileValidation = [
  body('displayName').optional().trim().notEmpty(),
  body('phoneNumber').optional().trim(),
];

const addressValidation = [
  body('street').trim().notEmpty().withMessage('Street is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('parish').trim().notEmpty().withMessage('Parish is required'),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('isDefault').optional().isBoolean(),
];

// Routes
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, updateProfile);
router.post('/upload-photo', upload.single('photo'), uploadPhoto);
router.post('/addresses', addressValidation, addAddress);
router.put('/addresses/:addressId', addressValidation, updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

export default router;

