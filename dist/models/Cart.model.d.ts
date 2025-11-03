import mongoose, { Document } from 'mongoose';
export interface ICartItem {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
}
export interface ICart extends Document {
    userId: mongoose.Types.ObjectId;
    items: ICartItem[];
    subtotal: number;
    itemCount: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICart, {}, {}, {}, mongoose.Document<unknown, {}, ICart, {}, {}> & ICart & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Cart.model.d.ts.map