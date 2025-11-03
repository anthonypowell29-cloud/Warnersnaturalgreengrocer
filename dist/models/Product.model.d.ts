import mongoose, { Document } from 'mongoose';
export interface IProduct extends Document {
    sellerId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    category: 'fruits' | 'vegetables';
    subcategory?: string;
    price: number;
    stock: number;
    images: string[];
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    parish: string;
    seasonal: boolean;
    available: boolean;
    isApproved: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Product.model.d.ts.map