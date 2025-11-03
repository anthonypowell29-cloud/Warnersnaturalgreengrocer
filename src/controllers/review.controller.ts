import { Request, Response } from 'express';
import Review, { IReviewModel } from '../models/Review.model';
import Product from '../models/Product.model';
import Order from '../models/Order.model';
import { TokenPayload } from '../utils/jwt.util';
import { uploadImage } from '../services/image.service';

interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { userId?: string };
}

// @desc    Get reviews for a product
// @route   GET /api/v1/reviews/product/:productId
// @access  Public
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query - only show moderated reviews
    const query: any = {
      productId,
      isModerated: true,
    };

    const reviews = await Review.find(query)
      .populate('userId', 'displayName photoURL')
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum);

    const total = await Review.countDocuments(query);

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

// @desc    Get single review
// @route   GET /api/v1/reviews/:id
// @access  Public
export const getReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('userId', 'displayName photoURL')
      .populate('productId', 'title images');

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

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch review',
      },
    });
  }
};

// @desc    Create review
// @route   POST /api/v1/reviews
// @access  Private
export const createReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { productId, orderId, rating, comment, images } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Validate product exists
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

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REVIEW_EXISTS',
          message: 'You have already reviewed this product',
        },
      });
      return;
    }

    // Verify purchase if orderId provided
    let isVerifiedPurchase = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        buyerId: userId,
        paymentStatus: 'paid',
      });
      if (order) {
        // Check if order contains this product
        const hasProduct = order.items.some(
          (item: any) => item.productId.toString() === productId
        );
        if (hasProduct) {
          isVerifiedPurchase = true;
        }
      }
    }

    // Handle image uploads if provided
    let imageUrls: string[] = [];
    if (images && Array.isArray(images) && images.length > 0) {
      // If images are base64 or file paths, upload them
      // For now, assuming images are already URLs
      imageUrls = images.filter((img: string) => img.startsWith('http'));
    }

    // Create review
    const review = await Review.create({
      productId,
      userId,
      orderId: orderId || undefined,
      rating: Number(rating),
      comment: comment.trim(),
      images: imageUrls,
      isVerifiedPurchase,
    });

    // Calculate and update product average rating
    const stats = await (Review as unknown as IReviewModel).calculateAverageRating(productId as any);
    await Product.findByIdAndUpdate(productId, {
      averageRating: stats.averageRating,
      totalReviews: stats.totalReviews,
      ratingDistribution: stats.distribution,
    });

    // Populate before sending response
    await review.populate('userId', 'displayName photoURL');

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create review',
      },
    });
  }
};

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private (Owner only)
export const updateReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { id } = req.params;
    const { rating, comment, images } = req.body;

    const review = await Review.findById(id);
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

    // Check ownership
    if (review.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own reviews',
        },
      });
      return;
    }

    // Update review
    review.rating = rating !== undefined ? Number(rating) : review.rating;
    review.comment = comment !== undefined ? comment.trim() : review.comment;
    if (images !== undefined) {
      review.images = Array.isArray(images) ? images : [];
    }

    await review.save();

    // Recalculate product average rating
    const ReviewModel = Review as any;
    const stats = await ReviewModel.calculateAverageRating(review.productId);
    await Product.findByIdAndUpdate(review.productId, {
      averageRating: stats.averageRating,
      totalReviews: stats.totalReviews,
      ratingDistribution: stats.distribution,
    });

    await review.populate('userId', 'displayName photoURL');

    res.status(200).json({
      success: true,
      data: review,
      message: 'Review updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update review',
      },
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private (Owner only)
export const deleteReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { id } = req.params;

    const review = await Review.findById(id);
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

    // Check ownership
    if (review.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own reviews',
        },
      });
      return;
    }

    const productId = review.productId;
    await review.deleteOne();

    // Recalculate product average rating
    const ReviewModel = Review as any;
    const stats = await ReviewModel.calculateAverageRating(productId);
    await Product.findByIdAndUpdate(productId, {
      averageRating: stats.averageRating,
      totalReviews: stats.totalReviews,
      ratingDistribution: stats.distribution,
    });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete review',
      },
    });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/v1/reviews/:id/helpful
// @access  Private
export const markHelpful = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

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

    review.helpfulCount += 1;
    await review.save();

    res.status(200).json({
      success: true,
      data: { helpfulCount: review.helpfulCount },
      message: 'Marked as helpful',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to mark review as helpful',
      },
    });
  }
};

// @desc    Report review
// @route   POST /api/v1/reviews/:id/report
// @access  Private
export const reportReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await Review.findById(id);
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

    review.reportedCount += 1;
    // Auto-moderate if reported multiple times
    if (review.reportedCount >= 3) {
      review.isModerated = false; // Hide from public until admin reviews
    }
    await review.save();

    // TODO: Notify admin about reported review
    // You can add an admin notification system here

    res.status(200).json({
      success: true,
      message: 'Review reported. Thank you for your feedback.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to report review',
      },
    });
  }
};

// @desc    Get user's reviews
// @route   GET /api/v1/reviews/user/:userId
// @access  Public
export const getUserReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ userId, isModerated: true })
      .populate('productId', 'title images')
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate average rating for user
    const stats = await Review.aggregate([
      { $match: { userId: new (require('mongoose')).Types.ObjectId(userId), isModerated: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        stats: stats[0] || { averageRating: 0, totalReviews: 0 },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch user reviews',
      },
    });
  }
};

