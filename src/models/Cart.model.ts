import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number; // Price at time of adding to cart
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  subtotal: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

const CartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: {
      type: [CartItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    itemCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate subtotal and itemCount before saving
CartSchema.pre('save', function (next) {
  this.subtotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  this.itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
  next();
});

// Indexes
CartSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model<ICart>('Cart', CartSchema);

