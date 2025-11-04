import { Request, Response } from 'express';
import User from '../models/User.model';
import Product from '../models/Product.model';
import Review, { IReviewModel, IReview } from '../models/Review.model';
import mongoose from 'mongoose';
import Order from '../models/Order.model';
import Transaction from '../models/Transaction.model';
import { TokenPayload } from '../utils/jwt.util';

interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { userId?: string };
}

// @desc    Get dashboard stats
// @route   GET /api/v1/admin/stats
// @access  Private (Admin only)
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalProducts,
      pendingProducts,
      totalReviews,
      pendingReviews,
      totalOrders,
      completedOrders,
      totalTransactions,
      totalRevenue,
      bannedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ userType: 'farmer' }),
      User.countDocuments({ userType: 'buyer' }),
      Product.countDocuments(),
      Product.countDocuments({ isApproved: false }),
      (Review as unknown as mongoose.Model<IReview>).countDocuments(),
      (Review as unknown as mongoose.Model<IReview>).countDocuments({ isModerated: false }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'delivered' }),
      Transaction.countDocuments({ status: 'success' }),
      Transaction.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).then((result) => result[0]?.total || 0),
      User.countDocuments({ isBanned: true }),
    ]);

    // Recent activity
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('buyerId', 'displayName email')
      .populate('sellerId', 'displayName email')
      .select('orderNumber totalAmount status createdAt');

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('displayName email userType createdAt isVerified');

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          farmers: totalFarmers,
          buyers: totalBuyers,
          banned: bannedUsers,
        },
        products: {
          total: totalProducts,
          pending: pendingProducts,
          approved: totalProducts - pendingProducts,
        },
        reviews: {
          total: totalReviews,
          pending: pendingReviews,
          moderated: totalReviews - pendingReviews,
        },
        orders: {
          total: totalOrders,
          completed: completedOrders,
        },
        transactions: {
          total: totalTransactions,
          revenue: totalRevenue,
        },
        recentOrders,
        recentUsers,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch dashboard stats',
      },
    });
  }
};

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private (Admin only)
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, userType, status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (search) {
      query.$or = [
        { email: { $regex: search as string, $options: 'i' } },
        { displayName: { $regex: search as string, $options: 'i' } },
      ];
    }

    if (userType && userType !== 'all') {
      query.userType = userType;
    }

    if (status === 'banned') {
      query.isBanned = true;
    } else if (status === 'active') {
      query.isBanned = { $ne: true };
    }

    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpires -verificationToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch users',
      },
    });
  }
};

// @desc    Get single user
// @route   GET /api/v1/admin/users/:id
// @access  Private (Admin only)
export const getUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpires -verificationToken');

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch user',
      },
    });
  }
};

// @desc    Update user (ban, verify, etc.)
// @route   PUT /api/v1/admin/users/:id
// @access  Private (Admin only)
export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { isBanned, isVerified, userType } = req.body;

    const updateData: any = {};
    if (isBanned !== undefined) updateData.isBanned = isBanned;
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (userType !== undefined && ['buyer', 'farmer', 'admin'].includes(userType)) {
      updateData.userType = userType;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update user',
      },
    });
  }
};

// @desc    Get all products (with filters)
// @route   GET /api/v1/admin/products
// @access  Private (Admin only)
export const getAllProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, category, isApproved, status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (isApproved !== undefined) {
      query.isApproved = isApproved === 'true';
    }

    if (status === 'pending') {
      query.isApproved = false;
    } else if (status === 'approved') {
      query.isApproved = true;
    }

    const products = await Product.find(query)
      .populate('sellerId', 'displayName email userType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch products',
      },
    });
  }
};

// @desc    Approve/Reject product
// @route   PUT /api/v1/admin/products/:id/approve
// @access  Private (Admin only)
export const approveProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { isApproved } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isApproved: isApproved === true || isApproved === 'true' },
      { new: true }
    ).populate('sellerId', 'displayName email');

    if (!product) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
      message: `Product ${isApproved ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update product',
      },
    });
  }
};

// @desc    Delete product (Admin only)
// @route   DELETE /api/v1/admin/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
      return;
    }

    // Delete all reviews associated with this product
    await Review.deleteMany({ productId: productId });

    // Delete the product
    await Product.findByIdAndDelete(productId);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete product',
      },
    });
  }
};

// @desc    Get all reviews (with filters)
// @route   GET /api/v1/admin/reviews
// @access  Private (Admin only)
export const getAllReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, isModerated, productId, userId } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (search) {
      query.comment = { $regex: search as string, $options: 'i' };
    }

    if (isModerated !== undefined) {
      query.isModerated = isModerated === 'true';
    }

    if (productId) {
      query.productId = productId;
    }

    if (userId) {
      query.userId = userId;
    }

    const reviews = await (Review as unknown as mongoose.Model<IReview>).find(query)
      .populate('productId', 'title images')
      .populate('userId', 'displayName email photoURL')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await (Review as unknown as mongoose.Model<IReview>).countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch reviews',
      },
    });
  }
};

// @desc    Moderate review
// @route   PUT /api/v1/admin/reviews/:id/moderate
// @access  Private (Admin only)
export const moderateReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { isModerated, moderatorNotes } = req.body;

    const review = await (Review as unknown as mongoose.Model<IReview>).findByIdAndUpdate(
      req.params.id,
      {
        isModerated: isModerated === true || isModerated === 'true',
        moderatorNotes,
      },
      { new: true }
    )
      .populate('productId', 'title')
      .populate('userId', 'displayName email');

    if (!review) {
      res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found',
        },
      });
      return;
    }

    // Recalculate product rating if moderated
    if (isModerated) {
      const stats = await (Review as unknown as IReviewModel).calculateAverageRating(review.productId as any);
      await Product.findByIdAndUpdate(review.productId, {
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        ratingDistribution: stats.distribution,
      });
    }

    res.status(200).json({
      success: true,
      data: review,
      message: `Review ${isModerated ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to moderate review',
      },
    });
  }
};

// @desc    Get all transactions
// @route   GET /api/v1/admin/transactions
// @access  Private (Admin only)
export const getAllTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, paymentGateway, startDate, endDate } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (paymentGateway) {
      query.paymentGateway = paymentGateway;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const transactions = await Transaction.find(query)
      .populate('orderId', 'orderNumber buyerId sellerId totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Transaction.countDocuments(query);

    // Calculate totals
    const totals = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        totals: totals[0] || { totalAmount: 0, successCount: 0, failedCount: 0 },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch transactions',
      },
    });
  }
};

// @desc    Get all orders (admin view)
// @route   GET /api/v1/admin/orders
// @access  Private (Admin only)
export const getAllOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, startDate, endDate } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const orders = await Order.find(query)
      .populate('buyerId', 'displayName email')
      .populate('sellerId', 'displayName email')
      .populate('items.productId', 'title images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Order.countDocuments(query);

    // Calculate totals
    const totals = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        totals: totals[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch orders',
      },
    });
  }
};

// @desc    Get payout summary for farmers
// @route   GET /api/v1/admin/payouts
// @access  Private (Admin only)
export const getPayouts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, farmerId, status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Calculate payouts from completed orders
    const orderQuery: any = {
      status: 'delivered',
      paymentStatus: 'paid',
    };

    if (farmerId) {
      orderQuery.sellerId = farmerId;
    }

    const orders = await Order.find(orderQuery)
      .populate('sellerId', 'displayName email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Group by farmer and calculate totals
    const farmerTotals = await Order.aggregate([
      { $match: orderQuery },
      {
        $group: {
          _id: '$sellerId',
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          // Assuming 10% platform fee, farmer gets 90%
          totalPayout: { $sum: { $multiply: ['$totalAmount', 0.9] } },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'farmer',
        },
      },
      { $unwind: '$farmer' },
      {
        $project: {
          farmerId: '$_id',
          farmerName: '$farmer.displayName',
          farmerEmail: '$farmer.email',
          totalRevenue: 1,
          orderCount: 1,
          totalPayout: 1,
          platformFee: { $multiply: ['$totalRevenue', 0.1] },
        },
      },
    ]);

    const total = farmerTotals.length;

    res.status(200).json({
      success: true,
      data: {
        payouts: farmerTotals,
        orders, // Recent orders for detail view
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch payouts',
      },
    });
  }
};

