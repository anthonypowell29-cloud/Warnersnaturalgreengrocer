"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const OrderItemSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const ShippingAddressSchema = new mongoose_1.Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    parish: { type: String, required: true },
    postalCode: { type: String, required: true },
});
const OrderSchema = new mongoose_1.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
    },
    buyerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    sellerId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    statusHistory: {
        type: [
            {
                status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] },
                timestamp: { type: Date, default: Date.now },
                updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
                notes: { type: String },
            },
        ],
        default: [],
        _id: false,
    },
    estimatedDeliveryDate: {
        type: Date,
    },
    actualDeliveryDate: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Generate unique order number before saving
OrderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        const year = new Date().getFullYear();
        const count = await mongoose_1.default.model('Order').countDocuments({});
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
exports.default = mongoose_1.default.model('Order', OrderSchema);
//# sourceMappingURL=Order.model.js.map