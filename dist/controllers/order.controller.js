"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.verifyPayment = exports.getOrder = exports.getOrders = exports.createOrder = void 0;
const Order_model_1 = __importDefault(require("../models/Order.model"));
const Cart_model_1 = __importDefault(require("../models/Cart.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const payment_service_1 = __importDefault(require("../services/payment.service"));
// @desc    Create order from cart
// @route   POST /api/v1/orders
// @access  Private
const createOrder = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { shippingAddressId, paymentMethod, notes } = req.body;
        if (!shippingAddressId || !paymentMethod) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Shipping address ID and payment method are required',
                },
            });
            return;
        }
        // Get user and shipping address
        const user = await User_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'User not found',
                },
            });
            return;
        }
        const shippingAddress = user.addresses.find((addr) => String(addr._id) === String(shippingAddressId));
        if (!shippingAddress) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
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
        // Validate products and calculate totals
        const orderItems = [];
        let subtotal = 0;
        let sellerId = null;
        for (const item of cart.items) {
            const product = await Product_model_1.default.findById(item.productId);
            if (!product) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'PRODUCT_NOT_FOUND',
                        message: `Product ${item.productId} not found`,
                    },
                });
                return;
            }
            if (!product.available || !product.isApproved) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'PRODUCT_UNAVAILABLE',
                        message: `Product "${product.title}" is not available`,
                    },
                });
                return;
            }
            if (product.stock < item.quantity) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INSUFFICIENT_STOCK',
                        message: `Product "${product.title}" has only ${product.stock} units available`,
                    },
                });
                return;
            }
            // Set seller ID (all items should be from the same seller for now)
            if (!sellerId) {
                sellerId = String(product.sellerId);
            }
            else if (String(product.sellerId) !== sellerId) {
                // For simplicity, we'll only allow orders from one seller at a time
                // In production, you might want to split orders per seller
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'MULTIPLE_SELLERS',
                        message: 'Cannot order from multiple sellers in one order. Please create separate orders.',
                    },
                });
                return;
            }
            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;
            orderItems.push({
                productId: product._id,
                productTitle: product.title,
                productImage: product.images[0],
                quantity: item.quantity,
                price: product.price,
                unit: product.unit || 'unit',
            });
        }
        // Calculate shipping fee (flat rate for now - can be dynamic based on location)
        const shippingFee = calculateShippingFee(shippingAddress.parish);
        const tax = 0; // GCT is 0% for food items in Jamaica (as of 2024)
        const total = subtotal + shippingFee + tax;
        // Create order
        const order = await Order_model_1.default.create({
            buyerId: userId,
            sellerId: sellerId,
            items: orderItems,
            shippingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                parish: shippingAddress.parish,
                postalCode: shippingAddress.postalCode,
                contactName: user.displayName,
                contactPhone: user.phoneNumber,
            },
            subtotal,
            shippingFee,
            tax,
            total,
            currency: 'JMD',
            paymentMethod: paymentMethod,
            paymentStatus: 'pending',
            orderStatus: 'pending',
            notes: notes || undefined,
        });
        // If payment method is card, initialize Wipay payment
        if (paymentMethod === 'card') {
            try {
                const paymentData = await payment_service_1.default.initializePayment({
                    email: user.email,
                    amount: total,
                    orderNumber: order.orderNumber,
                    orderId: String(order._id),
                    buyerId: String(userId),
                    description: `Order ${order.orderNumber}`,
                    customerName: user.displayName,
                    phone: user.phoneNumber,
                });
                // Update order with payment reference
                order.paymentReference = paymentData.transactionId;
                await order.save();
                res.status(201).json({
                    success: true,
                    data: {
                        order,
                        payment: {
                            paymentUrl: paymentData.paymentUrl,
                            transactionId: paymentData.transactionId,
                        },
                    },
                    message: 'Order created. Please complete payment.',
                });
                return;
            }
            catch (paymentError) {
                // If payment initialization fails, still create the order but mark it
                console.error('Payment initialization failed:', paymentError);
                order.paymentStatus = 'failed';
                await order.save();
                res.status(500).json({
                    success: false,
                    error: {
                        code: 'PAYMENT_INIT_FAILED',
                        message: `Order created but payment initialization failed: ${paymentError.message}`,
                    },
                    data: { order },
                });
                return;
            }
        }
        else {
            // For bank transfer or cash on delivery, just create the order
            res.status(201).json({
                success: true,
                data: { order },
                message: 'Order created successfully',
            });
            return;
        }
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
        const userId = req.user?.userId;
        const userType = req.user?.userType;
        const { status, limit = 50, page = 1 } = req.query;
        const query = {};
        if (userType === 'buyer') {
            query.buyerId = userId;
        }
        else if (userType === 'farmer') {
            query.sellerId = userId;
        }
        if (status) {
            query.orderStatus = status;
        }
        const orders = await Order_model_1.default.find(query)
            .populate('buyerId', 'displayName email phoneNumber')
            .populate('sellerId', 'displayName email phoneNumber')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Order_model_1.default.countDocuments(query);
        res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            },
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
        const userId = req.user?.userId;
        const { id } = req.params;
        const order = await Order_model_1.default.findById(id)
            .populate('buyerId', 'displayName email phoneNumber')
            .populate('sellerId', 'displayName email phoneNumber')
            .populate('items.productId');
        if (!order) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Order not found',
                },
            });
            return;
        }
        // Check if user has access to this order
        const isBuyer = String(order.buyerId) === String(userId);
        const isSeller = String(order.sellerId) === String(userId);
        if (!isBuyer && !isSeller) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this order',
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
// @desc    Verify payment (for PayStack callback)
// @route   GET /api/v1/orders/:id/verify-payment
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reference } = req.query;
        if (!reference) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Payment reference is required',
                },
            });
            return;
        }
        const order = await Order_model_1.default.findById(id);
        if (!order) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Order not found',
                },
            });
            return;
        }
        // Verify payment with Wipay
        const verification = await payment_service_1.default.verifyPayment(reference);
        if (verification.success && (verification.status === 'completed' || verification.status === 'success')) {
            // Payment successful
            order.paymentStatus = 'paid';
            order.orderStatus = 'confirmed';
            order.paymentTransactionId = verification.transactionId;
            await order.save();
            // Update product stock
            for (const item of order.items) {
                await Product_model_1.default.findByIdAndUpdate(item.productId, {
                    $inc: { stock: -item.quantity },
                });
            }
            // Clear cart
            const cart = await Cart_model_1.default.findOne({ userId: order.buyerId });
            if (cart) {
                cart.items = [];
                await cart.save();
            }
            res.status(200).json({
                success: true,
                data: {
                    order,
                    payment: {
                        verified: true,
                        amount: verification.amount,
                        currency: verification.currency,
                        status: verification.status,
                    },
                },
                message: 'Payment verified successfully',
            });
        }
        else {
            // Payment failed
            order.paymentStatus = 'failed';
            await order.save();
            res.status(400).json({
                success: false,
                error: {
                    code: 'PAYMENT_FAILED',
                    message: 'Payment verification failed',
                },
                data: { order },
            });
        }
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
// @desc    Update order status (for sellers/admins)
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Seller/Admin)
const updateOrderStatus = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const { orderStatus, cancellationReason } = req.body;
        const order = await Order_model_1.default.findById(id);
        if (!order) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Order not found',
                },
            });
            return;
        }
        // Check if user is the seller or admin
        const isSeller = String(order.sellerId) === String(userId);
        if (!isSeller) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only the seller can update order status',
                },
            });
            return;
        }
        // Update order status
        order.orderStatus = orderStatus;
        if (orderStatus === 'cancelled' && cancellationReason) {
            order.cancellationReason = cancellationReason;
            order.cancelledAt = new Date();
        }
        if (orderStatus === 'delivered') {
            order.deliveredAt = new Date();
        }
        await order.save();
        res.status(200).json({
            success: true,
            data: order,
            message: 'Order status updated',
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
/**
 * Calculate shipping fee based on parish
 * This is a simple implementation - you can make it more sophisticated
 */
function calculateShippingFee(parish) {
    // Base shipping fee in JMD
    const baseFee = 500; // JMD 500 base fee
    // Remote parishes might have higher fees
    const remoteParishes = ['St. Thomas', 'Portland', 'St. Mary', 'Hanover', 'Westmoreland'];
    if (remoteParishes.includes(parish)) {
        return baseFee + 300; // JMD 800 for remote areas
    }
    return baseFee;
}
//# sourceMappingURL=order.controller.js.map