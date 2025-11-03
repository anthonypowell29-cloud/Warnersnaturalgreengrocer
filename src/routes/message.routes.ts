import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getOrderMessages,
  sendMessage,
  getUnreadCount,
  markAsRead,
} from '../controllers/message.controller';

const router = Router();

// All message routes require authentication
router.use(authenticate);

router.get('/order/:orderId', getOrderMessages);
router.post('/', sendMessage);
router.get('/unread', getUnreadCount);
router.put('/read', markAsRead);

export default router;

