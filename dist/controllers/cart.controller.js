"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeItem = exports.updateItem = exports.addItem = exports.getCart = void 0;
const Cart_model_1 = __importDefault(require("../models/Cart.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
// @desc    Get user's cart
// @route   GET /api/v1/cart
// @access  Private
const getCart = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User ID not found',
                },
            });
            return;
        }
        let cart = await Cart_model_1.default.findOne({ userId }).populate('items.productId', 'title images price stock available');
        if (!cart) {
            // Create empty cart if it doesn't exist
            cart = await Cart_model_1.default.create({ userId, items: [] });
        }
        // Filter out unavailable products
        const availableItems = cart.items.filter((item) => {
            const product = item.productId;
            return product && product.available && product.stock >= item.quantity;
        });
        // Update cart if items were filtered
        if (availableItems.length !== cart.items.length) {
            cart.items = availableItems;
            await cart.save();
        }
        res.status(200).json({
            success: true,
            data: {
                items: cart.items.map((item) => {
                    const product = item.productId;
                    return {
                        productId: product?._id?.toString() || item.productId?.toString() || item.productId,
                        product: product,
                        quantity: item.quantity,
                        price: item.price,
                    };
                }),
                subtotal: cart.subtotal || 0,
                itemCount: cart.itemCount || 0,
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
const addItem = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { productId, quantity } = req.body;
        // Validate product exists and is available
        const product = await Product_model_1.default.findById(productId);
        if (!product) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'PRODUCT_NOT_FOUND',
                    message: 'Product not found',
                },
            });
            return;
        }
        if (!product.available || product.stock < quantity) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_STOCK',
                    message: 'Product is not available or insufficient stock',
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
        const existingItemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        if (existingItemIndex >= 0) {
            // Update quantity
            cart.items[existingItemIndex].quantity += quantity;
            cart.items[existingItemIndex].price = product.price; // Update price
        }
        else {
            // Add new item
            cart.items.push({
                productId,
                quantity,
                price: product.price,
            });
        }
        await cart.save();
        res.status(200).json({
            success: true,
            data: {
                items: cart.items,
                subtotal: cart.subtotal,
                itemCount: cart.itemCount,
            },
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
exports.addItem = addItem;
// @desc    Update item quantity in cart
// @route   PUT /api/v1/cart/items/:productId
// @access  Private
const updateItem = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { productId } = req.params;
        const { quantity } = req.body;
        if (quantity < 1) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_QUANTITY',
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
                    code: 'CART_NOT_FOUND',
                    message: 'Cart not found',
                },
            });
            return;
        }
        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        if (itemIndex === -1) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ITEM_NOT_FOUND',
                    message: 'Item not found in cart',
                },
            });
            return;
        }
        // Validate stock
        const product = await Product_model_1.default.findById(productId);
        if (!product || !product.available || product.stock < quantity) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_STOCK',
                    message: 'Insufficient stock',
                },
            });
            return;
        }
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].price = product.price; // Update price
        await cart.save();
        res.status(200).json({
            success: true,
            data: {
                items: cart.items,
                subtotal: cart.subtotal,
                itemCount: cart.itemCount,
            },
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
exports.updateItem = updateItem;
// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/items/:productId
// @access  Private
const removeItem = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { productId } = req.params;
        const cart = await Cart_model_1.default.findOne({ userId });
        if (!cart) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'CART_NOT_FOUND',
                    message: 'Cart not found',
                },
            });
            return;
        }
        cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
        await cart.save();
        res.status(200).json({
            success: true,
            data: {
                items: cart.items,
                subtotal: cart.subtotal,
                itemCount: cart.itemCount,
            },
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
exports.removeItem = removeItem;
// @desc    Clear entire cart
// @route   DELETE /api/v1/cart
// @access  Private
const clearCart = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const cart = await Cart_model_1.default.findOne({ userId });
        if (cart) {
            cart.items = [];
            await cart.save();
        }
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