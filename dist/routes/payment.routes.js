"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
const express_1 = require("express");
const payment_service_1 = __importDefault(require("../services/payment.service"));
const Order_model_1 = __importDefault(require("../models/Order.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
const Cart_model_1 = __importDefault(require("../models/Cart.model"));
const router = (0, express_1.Router)();
// Wipay webhook router
const webhookRouter = (0, express_1.Router)();
exports.webhookRouter = webhookRouter;
// Wipay may or may not need raw body - adjust based on their API
// webhookRouter.use(express.raw({ type: 'application/json' }));
/**
 * Wipay webhook endpoint
 * Wipay will POST to this endpoint when payment status changes
 */
webhookRouter.post('/webhook', async (req, res) => {
    // Wipay webhook - signature verification may be handled differently
    // Adjust based on Wipay's webhook security implementation
    try {
        // Process Wipay webhook
        const webhookData = await payment_service_1.default.handleWebhook(req.body);
        if (webhookData && webhookData.transactionId) {
            const orderId = webhookData.metadata?.orderId;
            if (orderId) {
                const order = await Order_model_1.default.findById(orderId);
                if (order) {
                    // Check payment status from webhook
                    if (webhookData.status === 'completed' || webhookData.status === 'success') {
                        // Payment successful
                        if (order.paymentStatus !== 'paid') {
                            order.paymentStatus = 'paid';
                            order.orderStatus = 'confirmed';
                            order.paymentTransactionId = webhookData.transactionId;
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
                            console.log(`Order ${order.orderNumber} payment confirmed via Wipay webhook`);
                        }
                    }
                    else if (webhookData.status === 'failed' || webhookData.status === 'cancelled') {
                        // Payment failed
                        order.paymentStatus = 'failed';
                        await order.save();
                        console.log(`Order ${order.orderNumber} payment failed via Wipay webhook`);
                    }
                }
            }
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: 'WEBHOOK_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * Get Wipay merchant configuration (for frontend if needed)
 */
router.get('/config', (req, res) => {
    const merchantId = payment_service_1.default.getMerchantId();
    res.status(200).json({
        success: true,
        data: {
            merchantId,
        },
    });
});
exports.default = router;
//# sourceMappingURL=payment.routes.js.map