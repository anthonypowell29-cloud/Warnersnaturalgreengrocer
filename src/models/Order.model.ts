import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  title: string;
}

export interface IShippingAddress {
  street: string;
  city: string;
  parish: string;
  postalCode: string;
}

export type PaymentMethod = 'card' | 'bank_transfer';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface IOrder extends Document {
  orderNumber: string; // Unique order number (e.g., ORD-2024-001234)
  buyerId: mongoose.Types.ObjectId;
  sellerId?: mongoose.Types.ObjectId; // For single-seller orders, or can be array for multi-seller
  items: IOrderItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string; // WIpay transaction reference
  paymentGateway: 'wipay' | 'bank_transfer';
  shippingAddress: IShippingAddress;
  deliveryOption: 'delivery' | 'pickup';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
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
  title: {
    type: String,
    required: true,
  },
});

const ShippingAddressSchema = new Schema<IShippingAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  parish: { type: String, required: true },
  postalCode: { type: String, required: true },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    items: {
      type: [OrderItemSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer'],
      required: true,
    },
    paymentReference: {
      type: String,
    },
    paymentGateway: {
      type: String,
      enum: ['wipay', 'bank_transfer'],
      default: 'wipay',
    },
    shippingAddress: {
      type: ShippingAddressSchema,
      required: true,
    },
    deliveryOption: {
      type: String,
      enum: ['delivery', 'pickup'],
      default: 'delivery',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique order number before saving
OrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Order').countDocuments({});
    this.orderNumber = `ORD-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes
OrderSchema.index({ buyerId: 1 });
OrderSchema.index({ sellerId: 1 });
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ paymentReference: 1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.model<IOrder>('Order', OrderSchema);

