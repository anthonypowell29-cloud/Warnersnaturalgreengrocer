import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: 'fruits' | 'vegetables';
  subcategory?: string;
  price: number; // JMD
  stock: number;
  images: string[]; // Cloudinary URLs
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  parish: string;
  seasonal: boolean;
  available: boolean;
  isApproved: boolean; // For admin moderation
  // Rating fields (calculated from reviews)
  averageRating?: number; // 1-5, calculated average
  totalReviews?: number; // Total number of reviews
  ratingDistribution?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a product title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a product description'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      enum: ['fruits', 'vegetables'],
      required: [true, 'Please select a category'],
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0, 'Price must be positive'],
    },
    stock: {
      type: Number,
      required: [true, 'Please add stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images: string[]) => images.length <= 5,
        message: 'Maximum 5 images per product',
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords: number[]) => coords.length === 2,
          message: 'Location must have longitude and latitude',
        },
      },
    },
    parish: {
      type: String,
      required: [true, 'Please select a parish'],
      index: true,
    },
    seasonal: {
      type: Boolean,
      default: false,
    },
    available: {
      type: Boolean,
      default: true,
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: true, // Products are immediately visible
      index: true,
    },
    // Rating fields (calculated from reviews)
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratingDistribution: {
      type: {
        '5': { type: Number, default: 0 },
        '4': { type: Number, default: 0 },
        '3': { type: Number, default: 0 },
        '2': { type: Number, default: 0 },
        '1': { type: Number, default: 0 },
      },
      default: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
      _id: false,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for location-based queries
ProductSchema.index({ location: '2dsphere' });
ProductSchema.index({ category: 1, available: 1, isApproved: 1 });
ProductSchema.index({ sellerId: 1, available: 1 });
ProductSchema.index({ title: 'text', description: 'text' }); // Text search index

export default mongoose.model<IProduct>('Product', ProductSchema);

