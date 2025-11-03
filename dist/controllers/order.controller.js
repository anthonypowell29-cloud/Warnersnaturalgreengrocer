"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderTracking = exports.updateOrderStatus = exports.getSellerOrders = exports.cancelOrder = exports.verifyPayment = exports.getOrder = exports.getOrders = exports.createOrder = void 0;
const Order_model_1 = __importDefault(require("../models/Order.model"));
const Cart_model_1 = __importDefault(require("../models/Cart.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
const Transaction_model_1 = __importDefault(require("../models/Transaction.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const payment_service_1 = require("../services/payment.service");
// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
const createOrder = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { shippingAddressId, paymentMethod, deliveryOption, notes, shippingFee } = req.body;
        // Get user to fetch shipping address
        const user = await User_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found',
                },
            });
            return;
        }
        // Find shipping address
        const shippingAddress = user.addresses.find((addr) => addr._id?.toString() === shippingAddressId);
        if (!shippingAddress) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ADDRESS_NOT_FOUND',
                    message: 'Shipping address not found',
                },
            });
            return;
        }
        // Get cart
        const cart = await Cart_model_1.default.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'EMPTY_CART',
                    message: 'Cart is empty',
                },
            });
            return;
        }
        // Validate products and get seller
        let sellerId;
        const orderItems = [];
        for (const cartItem of cart.items) {
            const product = await Product_model_1.default.findById(cartItem.productId);
            if (!product || !product.available || product.stock < cartItem.quantity) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'PRODUCT_UNAVAILABLE',
                        message: `Product ${product?.title || 'unknown'} is not available`,
                    },
                });
                return;
            }
            if (!sellerId) {
                sellerId = product.sellerId.toString();
            }
            orderItems.push({
                productId: product._id,
                quantity: cartItem.quantity,
                price: cartItem.price,
                title: product.title,
            });
        }
        // Calculate shipping fee based on delivery option
        const finalDeliveryOption = deliveryOption || 'delivery';
        const finalShippingFee = finalDeliveryOption === 'pickup' ? 0 : (shippingFee || 500); // Default JMD 500
        const subtotal = cart.subtotal;
        const totalAmount = subtotal + finalShippingFee;
        // Create order
        const order = await Order_model_1.default.create({
            buyerId: userId,
            sellerId,
            items: orderItems,
            subtotal,
            shippingFee: finalShippingFee,
            totalAmount,
            paymentMethod,
            paymentGateway: paymentMethod === 'card' ? 'wipay' : 'bank_transfer',
            shippingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                parish: shippingAddress.parish,
                postalCode: shippingAddress.postalCode,
            },
            deliveryOption: deliveryOption || 'delivery',
            notes,
            // Initialize status history
            statusHistory: [
                {
                    status: 'pending',
                    timestamp: new Date(),
                    updatedBy: userId,
                },
            ],
        });
        // Handle payment based on method
        let paymentData = null;
        if (paymentMethod === 'card') {
            try {
                // Initialize WIpay payment
                const paymentRequest = await payment_service_1.paymentService.createPayment({
                    amount: totalAmount,
                    currency: 'JMD',
                    orderId: order.orderNumber,
                    customerEmail: user.email,
                    customerName: user.displayName,
                    description: `Order ${order.orderNumber}`,
                    returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/order-confirmation?orderId=${order._id}`,
                    cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/checkout?cancelled=true`,
                });
                // Create transaction record
                await Transaction_model_1.default.create({
                    orderId: order._id,
                    amount: totalAmount,
                    currency: 'JMD',
                    paymentGateway: 'wipay',
                    paymentReference: paymentRequest.reference,
                    gatewayTransactionId: paymentRequest.transactionId,
                    status: 'pending',
                });
                // Update order with payment reference
                order.paymentReference = paymentRequest.reference;
                await order.save();
                paymentData = {
                    paymentUrl: paymentRequest.paymentUrl,
                    transactionId: paymentRequest.transactionId,
                    reference: paymentRequest.reference,
                };
            }
            catch (paymentError) {
                // If payment initialization fails, still create order but mark as failed
                order.paymentStatus = 'failed';
                await order.save();
                res.status(500).json({
                    success: false,
                    error: {
                        code: 'PAYMENT_INIT_FAILED',
                        message: paymentError.message || 'Failed to initialize payment',
                    },
                });
                return;
            }
        }
        else {
            // Bank transfer - create transaction record
            await Transaction_model_1.default.create({
                orderId: order._id,
                amount: totalAmount,
                currency: 'JMD',
                paymentGateway: 'bank_transfer',
                paymentReference: order.orderNumber,
                status: 'pending',
            });
        }
        // Update product stock
        for (const item of orderItems) {
            await Product_model_1.default.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity },
            });
        }
        res.status(201).json({
            success: true,
            data: {
                order,
                payment: paymentData,
            },
            message: 'Order created successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to create order',
            },
        });
    }
};
exports.createOrder = createOrder;
// @desc    Get user's orders
// @route   GET /api/v1/orders
// @access  Private
const getOrders = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { status } = req.query;
        const query = { buyerId: userId };
        if (status) {
            query.status = status;
        }
        const orders = await Order_model_1.default.find(query)
            .populate('items.productId', 'title images')
            .populate('sellerId', 'displayName photoURL')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: orders,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to fetch orders',
            },
        });
    }
};
exports.getOrders = getOrders;
// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
const getOrder = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { id } = req.params;
        const order = await Order_model_1.default.findOne({ _id: id, buyerId: userId })
            .populate('items.productId', 'title images price')
            .populate('sellerId', 'displayName photoURL phoneNumber');
        if (!order) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found',
                },
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: order,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to fetch order',
            },
        });
    }
};
exports.getOrder = getOrder;
// @desc    Verify payment for order
// @route   POST /api/v1/orders/:id/verify-payment
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { id } = req.params;
        const { reference } = req.body;
        const order = await Order_model_1.default.findOne({ _id: id, buyerId: userId });
        if (!order) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found',
                },
            });
            return;
        }
        if (order.paymentStatus === 'paid') {
            res.status(200).json({
                success: true,
                data: order,
                message: 'Payment already verified',
            });
            return;
        }
        // Verify payment with WIpay
        if (order.paymentGateway === 'wipay' && reference) {
            const verification = await payment_service_1.paymentService.verifyPayment(reference);
            if (verification.status === 'success') {
                order.paymentStatus = 'paid';
                order.status = 'confirmed';
                // Update transaction
                await Transaction_model_1.default.findOneAndUpdate({ orderId: order._id }, { status: 'success', metadata: verification.metadata });
            }
            else {
                order.paymentStatus = 'failed';
                await Transaction_model_1.default.findOneAndUpdate({ orderId: order._id }, { status: 'failed' });
            }
            await order.save();
        }
        res.status(200).json({
            success: true,
            data: order,
            message: 'Payment verification completed',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to verify payment',
            },
        });
    }
};
exports.verifyPayment = verifyPayment;
// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { id } = req.params;
        const order = await Order_model_1.default.findOne({ _id: id, buyerId: userId });
        if (!order) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found',
                },
            });
            return;
        }
        if (order.status === 'delivered' || order.status === 'cancelled') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_STATUS',
                    message: 'Order cannot be cancelled',
                },
            });
            return;
        }
        order.status = 'cancelled';
        // Restore product stock
        for (const item of order.items) {
            await Product_model_1.default.findByIdAndUpdate(item.productId, {
                $inc: { stock: item.quantity },
            });
        }
        await order.save();
        res.status(200).json({
            success: true,
            data: order,
            message: 'Order cancelled successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to cancel order',
            },
        });
    }
};
exports.cancelOrder = cancelOrder;
// @desc    Get seller's orders
// @route   GET /api/v1/orders/seller
// @access  Private (Seller only)
const getSellerOrders = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { status, page = 1, limit = 10 } = req.query;
        const query = { sellerId: userId };
        if (status) {
            query.status = status;
        }
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const orders = await Order_model_1.default.find(query)
            .populate('items.productId', 'title images')
            .populate('buyerId', 'displayName photoURL phoneNumber')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);
        const total = await Order_model_1.default.countDocuments(query);
        res.status(200).json({
            success: true,
            data: {
                orders,
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
                message: error.message || 'Failed to fetch seller orders',
            },
        });
    }
};
exports.getSellerOrders = getSellerOrders;
// @desc    Update order status (Seller only)
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Seller only)
const updateOrderStatus = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { id } = req.params;
        const { status, notes } = req.body;
        const order = await Order_model_1.default.findById(id);
        if (!order) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found',
                },
            });
            return;
        }
        // Verify seller owns this order
        if (order.sellerId?.toString() !== userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You can only update your own orders',
                },
            });
            return;
        }
        // Validate status transition
        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_STATUS',
                    message: 'Invalid order status',
                },
            });
            return;
        }
        // Prevent status downgrades
        const statusOrder = {
            pending: 0,
            confirmed: 1,
            preparing: 2,
            ready: 3,
            delivered: 4,
            cancelled: 5,
        };
        if (statusOrder[status] < statusOrder[order.status]) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_STATUS_TRANSITION',
                    message: 'Cannot revert order status',
                },
            });
            return;
        }
        // Update status
        const oldStatus = order.status;
        order.status = status;
        // Add to status history
        if (!order.statusHistory) {
            order.statusHistory = [];
        }
        order.statusHistory.push({
            status: status,
            timestamp: new Date(),
            updatedBy: userId,
            notes: notes || undefined,
        });
        // Set dates based on status
        if (status === 'delivered') {
            order.actualDeliveryDate = new Date();
        }
        else if (status === 'ready' && order.deliveryOption === 'pickup') {
            order.estimatedDeliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
        }
        else if (status === 'preparing' && order.deliveryOption === 'delivery') {
            order.estimatedDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
        }
        await order.save();
        // TODO: Send push notification to buyer about status update
        res.status(200).json({
            success: true,
            data: order,
            message: `Order status updated from ${oldStatus} to ${status}`,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to update order status',
            },
        });
    }
};
exports.updateOrderStatus = updateOrderStatus;
// @desc    Get order tracking info
// @route   GET /api/v1/orders/:id/tracking
// @access  Private
const getOrderTracking = async (req, res) => {
    try {
        const userId = req.user?.userId || '';
        const { id } = req.params;
        const order = await Order_model_1.default.findOne({
            _id: id,
            $or: [{ buyerId: userId }, { sellerId: userId }],
        })
            .populate('buyerId', 'displayName photoURL phoneNumber')
            .populate('sellerId', 'displayName photoURL phoneNumber')
            .populate('items.productId', 'title images');
        if (!order) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found',
                },
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: order,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Failed to fetch order tracking',
            },
        });
    }
};
exports.getOrderTracking = getOrderTracking;
//# sourceMappingURL=order.controller.js.map