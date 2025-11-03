import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createOrder,
  getOrders,
  getOrder,
  verifyPayment,
  cancelOrder,
  getSellerOrders,
  updateOrderStatus,
  getOrderTracking,
} from '../controllers/order.controller';

const router = Router();

// All order routes require authentication
router.use(authenticate);

router.route('/').get(getOrders).post(createOrder);
router.get('/seller', getSellerOrders);
router.route('/:id').get(getOrder);
router.get('/:id/tracking', getOrderTracking);
router.route('/:id/verify-payment').post(verifyPayment);
router.route('/:id/cancel').put(cancelOrder);
router.put('/:id/status', updateOrderStatus);

export default router;

