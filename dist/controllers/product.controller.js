"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProducts = exports.getMyProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const Product_model_1 = __importDefault(require("../models/Product.model"));
const image_service_1 = require("../services/image.service");
// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const { category, parish, minPrice, maxPrice, search, available, page = 1, limit = 20, sort = '-createdAt', } = req.query;
        // Build query
        const query = {
            available: available !== 'false',
            isApproved: true, // Only show approved products
        };
        if (category) {
            query.category = category;
        }
        if (parish) {
            query.parish = parish;
        }
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice)
                query.price.$gte = Number(minPrice);
            if (maxPrice)
                query.price.$lte = Number(maxPrice);
        }
        if (search) {
            query.$text = { $search: search };
        }
        // Pagination
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        // Execute query
        const products = await Product_model_1.default.find(query)
            .populate('sellerId', 'displayName photoURL userType')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);
        const total = await Product_model_1.default.countDocuments(query);
        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to fetch products',
            },
        });
    }
};
exports.getProducts = getProducts;
// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
const getProduct = async (req, res) => {
    try {
        const product = await Product_model_1.default.findById(req.params.id).populate('sellerId', 'displayName photoURL userType isVerified');
        if (!product) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Product not found',
                },
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: product,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to fetch product',
            },
        });
    }
};
exports.getProduct = getProduct;
// @desc    Create product
// @route   POST /api/v1/products
// @access  Private (Farmer only)
const createProduct = async (req, res) => {
    try {
        const userId = req.user?.userId;
        // Check if user is a farmer
        if (req.user?.userType !== 'farmer') {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only farmers can create products',
                },
            });
            return;
        }
        const { title, description, category, subcategory, price, stock, parish, latitude, longitude, seasonal, } = req.body;
        // Validate location
        if (!latitude || !longitude) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Location (latitude and longitude) is required',
                },
            });
            return;
        }
        // Handle image uploads
        const images = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                const uploadResult = await (0, image_service_1.uploadImage)(file, 'jamaican-marketplace/products');
                images.push(uploadResult.url);
            }
        }
        // Create product
        const product = await Product_model_1.default.create({
            sellerId: userId,
            title,
            description,
            category,
            subcategory,
            price: Number(price),
            stock: Number(stock),
            images,
            location: {
                type: 'Point',
                coordinates: [Number(longitude), Number(latitude)],
            },
            parish,
            seasonal: seasonal === 'true' || seasonal === true,
            available: Number(stock) > 0,
            isApproved: false, // Requires admin approval
        });
        res.status(201).json({
            success: true,
            data: product,
            message: 'Product created successfully. Pending approval.',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to create product',
            },
        });
    }
};
exports.createProduct = createProduct;
// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Owner only)
const updateProduct = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const productId = req.params.id;
        const product = await Product_model_1.default.findById(productId);
        if (!product) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Product not found',
                },
            });
            return;
        }
        // Check ownership
        if (String(product.sellerId) !== userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You can only update your own products',
                },
            });
            return;
        }
        // Update fields
        const { title, description, category, subcategory, price, stock, parish, latitude, longitude, seasonal, available, } = req.body;
        if (title)
            product.title = title;
        if (description)
            product.description = description;
        if (category)
            product.category = category;
        if (subcategory !== undefined)
            product.subcategory = subcategory;
        if (price)
            product.price = Number(price);
        if (stock !== undefined) {
            product.stock = Number(stock);
            product.available = Number(stock) > 0;
        }
        if (parish)
            product.parish = parish;
        if (latitude && longitude) {
            product.location.coordinates = [Number(longitude), Number(latitude)];
        }
        if (seasonal !== undefined)
            product.seasonal = seasonal === 'true' || seasonal === true;
        if (available !== undefined)
            product.available = available === 'true' || available === true;
        // Handle new image uploads
        if (req.files && Array.isArray(req.files)) {
            const newImages = [];
            for (const file of req.files) {
                const uploadResult = await (0, image_service_1.uploadImage)(file, 'jamaican-marketplace/products');
                newImages.push(uploadResult.url);
            }
            product.images = [...product.images, ...newImages];
        }
        await product.save();
        res.status(200).json({
            success: true,
            data: product,
            message: 'Product updated successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to update product',
            },
        });
    }
};
exports.updateProduct = updateProduct;
// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Owner only)
const deleteProduct = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const productId = req.params.id;
        const product = await Product_model_1.default.findById(productId);
        if (!product) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Product not found',
                },
            });
            return;
        }
        // Check ownership
        if (String(product.sellerId) !== userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You can only delete your own products',
                },
            });
            return;
        }
        await Product_model_1.default.findByIdAndDelete(productId);
        res.status(200).json({
            success: true,
            message: 'Product deleted successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to delete product',
            },
        });
    }
};
exports.deleteProduct = deleteProduct;
// @desc    Get seller's products
// @route   GET /api/v1/products/seller/my-products
// @access  Private (Farmer)
const getMyProducts = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (req.user?.userType !== 'farmer') {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only farmers can view their products',
                },
            });
            return;
        }
        const products = await Product_model_1.default.find({ sellerId: userId }).sort('-createdAt');
        res.status(200).json({
            success: true,
            data: {
                products,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to fetch products',
            },
        });
    }
};
exports.getMyProducts = getMyProducts;
// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Public
const searchProducts = async (req, res) => {
    try {
        const { q, category, parish, minPrice, maxPrice } = req.query;
        const query = {
            available: true,
            isApproved: true,
        };
        if (q) {
            query.$text = { $search: q };
        }
        if (category) {
            query.category = category;
        }
        if (parish) {
            query.parish = parish;
        }
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice)
                query.price.$gte = Number(minPrice);
            if (maxPrice)
                query.price.$lte = Number(maxPrice);
        }
        const products = await Product_model_1.default.find(query)
            .populate('sellerId', 'displayName photoURL userType')
            .limit(50)
            .sort(q ? { score: { $meta: 'textScore' } } : '-createdAt');
        res.status(200).json({
            success: true,
            data: {
                products,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Search failed',
            },
        });
    }
};
exports.searchProducts = searchProducts;
//# sourceMappingURL=product.controller.js.map