"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const Cart_model_1 = __importDefault(require("../models/Cart.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
// @desc    Get user's cart
// @route   GET /api/v1/cart
// @access  Private
const getCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        let cart = await Cart_model_1.default.findOne({ userId }).populate('items.productId');
        if (!cart) {
            // Create empty cart if it doesn't exist
            cart = await Cart_model_1.default.create({ userId, items: [] });
        }
        // Calculate cart totals and validate items
        const items = await Promise.all(cart.items.map(async (item) => {
            const product = await Product_model_1.default.findById(item.productId);
            if (!product || !product.available || !product.isApproved) {
                // Remove invalid items
                return null;
            }
            return {
                _id: item.productId._id || item.productId,
                productId: item.productId._id || item.productId,
                quantity: item.quantity,
                product: {
                    _id: product._id,
                    title: product.title,
                    description: product.description,
                    price: product.price,
                    unit: product.unit || 'unit',
                    stock: product.stock,
                    images: product.images,
                    sellerId: product.sellerId,
                    parish: product.parish,
                },
            };
        }));
        // Filter out null items (invalid products)
        const validItems = items.filter((item) => item !== null);
        // Update cart with valid items only
        if (validItems.length !== cart.items.length) {
            cart.items = validItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
            }));
            await cart.save();
        }
        // Calculate totals
        const subtotal = validItems.reduce((sum, item) => {
            return sum + item.product.price * item.quantity;
        }, 0);
        res.status(200).json({
            success: true,
            data: {
                items: validItems,
                subtotal,
                itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to fetch cart',
            },
        });
    }
};
exports.getCart = getCart;
// @desc    Add item to cart
// @route   POST /api/v1/cart/items
// @access  Private
const addToCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { productId, quantity } = req.body;
        if (!productId || !quantity || quantity < 1) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Product ID and quantity (min 1) are required',
                },
            });
            return;
        }
        // Check if product exists and is available
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
        if (!product.available || !product.isApproved) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'PRODUCT_UNAVAILABLE',
                    message: 'Product is not available for purchase',
                },
            });
            return;
        }
        if (product.stock < quantity) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_STOCK',
                    message: `Only ${product.stock} units available in stock`,
                },
            });
            return;
        }
        // Get or create cart
        let cart = await Cart_model_1.default.findOne({ userId });
        if (!cart) {
            cart = await Cart_model_1.default.create({ userId, items: [] });
        }
        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
        if (existingItemIndex >= 0) {
            // Update quantity
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            if (newQuantity > product.stock) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INSUFFICIENT_STOCK',
                        message: `Cannot add ${quantity} more. Total would exceed available stock (${product.stock})`,
                    },
                });
                return;
            }
            cart.items[existingItemIndex].quantity = newQuantity;
        }
        else {
            // Add new item
            cart.items.push({ productId, quantity });
        }
        await cart.save();
        // Return updated cart
        const updatedCart = await Cart_model_1.default.findById(cart._id).populate('items.productId');
        res.status(200).json({
            success: true,
            data: updatedCart,
            message: 'Item added to cart',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to add item to cart',
            },
        });
    }
};
exports.addToCart = addToCart;
// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/items/:productId
// @access  Private
const updateCartItem = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { productId } = req.params;
        const { quantity } = req.body;
        if (!quantity || quantity < 1) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Quantity must be at least 1',
                },
            });
            return;
        }
        const cart = await Cart_model_1.default.findOne({ userId });
        if (!cart) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Cart not found',
                },
            });
            return;
        }
        const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
        if (itemIndex === -1) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Item not found in cart',
                },
            });
            return;
        }
        // Check stock availability
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
        if (quantity > product.stock) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_STOCK',
                    message: `Only ${product.stock} units available in stock`,
                },
            });
            return;
        }
        cart.items[itemIndex].quantity = quantity;
        await cart.save();
        res.status(200).json({
            success: true,
            data: cart,
            message: 'Cart item updated',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to update cart item',
            },
        });
    }
};
exports.updateCartItem = updateCartItem;
// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/items/:productId
// @access  Private
const removeFromCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { productId } = req.params;
        const cart = await Cart_model_1.default.findOne({ userId });
        if (!cart) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Cart not found',
                },
            });
            return;
        }
        cart.items = cart.items.filter((item) => String(item.productId) !== String(productId));
        await cart.save();
        res.status(200).json({
            success: true,
            data: cart,
            message: 'Item removed from cart',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to remove item from cart',
            },
        });
    }
};
exports.removeFromCart = removeFromCart;
// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Private
const clearCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const cart = await Cart_model_1.default.findOne({ userId });
        if (!cart) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Cart not found',
                },
            });
            return;
        }
        cart.items = [];
        await cart.save();
        res.status(200).json({
            success: true,
            message: 'Cart cleared',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to clear cart',
            },
        });
    }
};
exports.clearCart = clearCart;
//# sourceMappingURL=cart.controller.js.map