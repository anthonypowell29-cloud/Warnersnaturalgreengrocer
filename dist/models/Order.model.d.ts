import mongoose, { Document } from 'mongoose';
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
    orderNumber: string;
    buyerId: mongoose.Types.ObjectId;
    sellerId?: mongoose.Types.ObjectId;
    items: IOrderItem[];
    subtotal: number;
    shippingFee: number;
    totalAmount: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    paymentGateway: 'wipay' | 'bank_transfer';
    shippingAddress: IShippingAddress;
    deliveryOption: 'delivery' | 'pickup';
    notes?: string;
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