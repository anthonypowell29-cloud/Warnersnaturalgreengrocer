import mongoose, { Schema, Document } from 'mongoose';

export type TransactionStatus = 'pending' | 'success' | 'failed';
export type PaymentGateway = 'wipay' | 'bank_transfer';

export interface ITransaction extends Document {
  orderId: mongoose.Types.ObjectId;
  amount: number; // Amount in JMD (dollars)
  currency: string; // 'JMD'
  paymentGateway: PaymentGateway;
  paymentReference: string; // WIpay transaction ID or bank transfer reference
  gatewayTransactionId?: string; // WIpay transaction ID
  status: TransactionStatus;
  metadata: Record<string, any>; // Additional gateway response data
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'JMD',
    },
    paymentGateway: {
      type: String,
      enum: ['wipay', 'bank_transfer'],
      required: true,
    },
    paymentReference: {
      type: String,
      required: true,
    },
    gatewayTransactionId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TransactionSchema.index({ orderId: 1 });
TransactionSchema.index({ paymentReference: 1 });
TransactionSchema.index({ gatewayTransactionId: 1 });
TransactionSchema.index({ createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);

