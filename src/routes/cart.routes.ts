import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} from '../controllers/cart.controller';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

router.route('/').get(getCart).delete(clearCart);
router.route('/items').post(addItem);
router.route('/items/:productId').put(updateItem).delete(removeItem);

export default router;

