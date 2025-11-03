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
const ProductSchema = new mongoose_1.Schema({
    sellerId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            validator: (images) => images.length <= 5,
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
                validator: (coords) => coords.length === 2,
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
        default: false, // Products need admin approval
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
}, {
    timestamps: true,
});
// Geospatial index for location-based queries
ProductSchema.index({ location: '2dsphere' });
ProductSchema.index({ category: 1, available: 1, isApproved: 1 });
ProductSchema.index({ sellerId: 1, available: 1 });
ProductSchema.index({ title: 'text', description: 'text' }); // Text search index
exports.default = mongoose_1.default.model('Product', ProductSchema);
//# sourceMappingURL=Product.model.js.map