import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId; // For verified purchase
  rating: number; // 1-5
  comment: string;
  images?: string[]; // Optional review images (Cloudinary URLs)
  isVerifiedPurchase: boolean;
  helpfulCount: number; // Number of users who found this helpful
  reportedCount: number; // Number of times review was reported
  isModerated: boolean; // Admin moderation status
  moderatorNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      // Optional - for verified purchase tracking
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images: string[]) => images.length <= 3,
        message: 'Maximum 3 images per review',
      },
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isModerated: {
      type: Boolean,
      default: false,
    },
    moderatorNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true }); // One review per user per product
ReviewSchema.index({ orderId: 1 });
ReviewSchema.index({ isModerated: 1 });

// Static method to calculate average rating
ReviewSchema.statics.calculateAverageRating = async function (
  productId: mongoose.Types.ObjectId
): Promise<{
  averageRating: number;
  totalReviews: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
}> {
  const stats = await this.aggregate([
    {
      $match: { productId, isModerated: true },
    },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating',
        },
      },
    },
  ]);

  if (stats.length > 0) {
    const distribution: { 5: number; 4: number; 3: number; 2: number; 1: number } = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    stats[0].ratingDistribution.forEach((rating: number) => {
      const key = rating as keyof typeof distribution;
      if (key >= 1 && key <= 5) {
        distribution[key]++;
      }
    });

    return {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
      distribution,
    };
  }

  return {
    averageRating: 0,
    totalReviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };
};

export interface IReviewModel extends Model<IReview> {
  calculateAverageRating(productId: mongoose.Types.ObjectId): Promise<{
    averageRating: number;
    totalReviews: number;
    distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  }>;
}

export default mongoose.model<IReview, IReviewModel>('Review', ReviewSchema);

