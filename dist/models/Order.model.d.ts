import mongoose, { Document } from 'mongoose';
export interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    productTitle: string;
    productImage?: string;
    quantity: number;
    price: number;
    unit: string;
}
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentMethod = 'card' | 'bank_transfer' | 'cash_on_delivery';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
export interface IOrder extends Document {
    orderNumber: string;
    buyerId: mongoose.Types.ObjectId;
    sellerId: mongoose.Types.ObjectId;
    items: IOrderItem[];
    shippingAddress: {
        street: string;
        city: string;
        parish: string;
        postalCode: string;
        contactName?: string;
        contactPhone?: string;
    };
    subtotal: number;
    shippingFee: number;
    tax: number;
    total: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
    paymentReference?: string;
    paymentTransactionId?: string;
    notes?: string;
    estimatedDeliveryDate?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Order.model.d.ts.map