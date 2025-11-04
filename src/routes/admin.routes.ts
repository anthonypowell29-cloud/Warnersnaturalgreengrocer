import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getDashboardStats,
  getAllUsers,
  getUser,
  updateUser,
  getAllProducts,
  approveProduct,
  deleteProduct,
  getAllReviews,
  moderateReview,
  getAllTransactions,
  getAllOrders,
  getPayouts,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/stats', getDashboardStats);

// Users
router.route('/users').get(getAllUsers);
router.route('/users/:id').get(getUser).put(updateUser);

// Products
router.route('/products').get(getAllProducts);
router.delete('/products/:id', deleteProduct);
router.put('/products/:id/approve', approveProduct);

// Reviews
router.route('/reviews').get(getAllReviews);
router.put('/reviews/:id/moderate', moderateReview);

// Transactions
router.route('/transactions').get(getAllTransactions);

// Orders
router.route('/orders').get(getAllOrders);

// Payouts
router.route('/payouts').get(getPayouts);

export default router;

