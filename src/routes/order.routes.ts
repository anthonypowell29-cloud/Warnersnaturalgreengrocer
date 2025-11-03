import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createOrder,
  getOrders,
  getOrder,
  verifyPayment,
  cancelOrder,
} from '../controllers/order.controller';

const router = Router();

// All order routes require authentication
router.use(authenticate);

router.route('/').get(getOrders).post(createOrder);
router.route('/:id').get(getOrder);
router.route('/:id/verify-payment').post(verifyPayment);
router.route('/:id/cancel').put(cancelOrder);

export default router;

