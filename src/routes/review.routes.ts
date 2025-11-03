import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getProductReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  reportReview,
  getUserReviews,
} from '../controllers/review.controller';

const router = Router();

// Public routes
router.get('/product/:productId', getProductReviews);
router.get('/user/:userId', getUserReviews);
router.get('/:id', getReview);

// Protected routes
router.use(authenticate);

router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/helpful', markHelpful);
router.post('/:id/report', reportReview);

export default router;

