"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class PaymentService {
    constructor() {
        this.config = null;
        const apiKey = process.env.WIPAY_API_KEY || '';
        const merchantId = process.env.WIPAY_MERCHANT_ID || '';
        const isProduction = process.env.NODE_ENV === 'production';
        if (apiKey && merchantId) {
            this.config = {
                apiKey,
                merchantId,
                baseUrl: isProduction
                    ? 'https://wipayfinancial.com/gateway' // Production URL (verify with Wipay)
                    : 'https://wipayfinancial.com/sandbox', // Sandbox/Test URL (verify with Wipay)
                isProduction,
            };
        }
        else {
            console.warn('⚠️  Wipay credentials not configured. Payment features will not work.\n' +
                'Please set WIPAY_API_KEY and WIPAY_MERCHANT_ID in your .env file.\n' +
                'Contact Wipay Jamaica to get your credentials: https://wipaycaribbean.com/jamaica');
        }
    }
    /**
     * Initialize payment with Wipay
     * Wipay typically uses a redirect-based payment flow
     */
    async initializePayment(data) {
        if (!this.config) {
            throw new Error('Wipay is not configured. Please set WIPAY_API_KEY and WIPAY_MERCHANT_ID in .env file.');
        }
        try {
            // Wipay payment request structure
            // Note: Actual API structure may vary - consult Wipay documentation
            const paymentRequest = {
                merchant_id: this.config.merchantId,
                amount: data.amount.toString(), // Wipay uses string amounts for JMD
                currency: 'JMD',
                order_id: data.orderNumber,
                order_number: data.orderNumber,
                description: data.description || `Order ${data.orderNumber}`,
                email: data.email,
                customer_name: data.customerName || data.email,
                phone: data.phone || '',
                callback_url: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/payment/callback`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/payment/cancelled`,
                metadata: {
                    orderId: data.orderId,
                    buyerId: data.buyerId,
                },
            };
            // Make API request to Wipay
            // Note: Adjust endpoint and request format based on Wipay's actual API documentation
            const response = await axios_1.default.post(`${this.config.baseUrl}/api/v1/transactions`, paymentRequest, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            // Wipay typically returns a payment URL to redirect to
            if (response.data && response.data.payment_url) {
                return {
                    paymentUrl: response.data.payment_url,
                    transactionId: response.data.transaction_id || response.data.reference,
                    orderId: data.orderId,
                };
            }
            else {
                throw new Error('Invalid response from Wipay API');
            }
        }
        catch (error) {
            if (error.response) {
                throw new Error(`Wipay API error: ${error.response.data?.message || error.message}`);
            }
            throw new Error(`Payment initialization failed: ${error.message}`);
        }
    }
    /**
     * Verify payment transaction
     * Typically called via webhook or after redirect
     */
    async verifyPayment(transactionId) {
        if (!this.config) {
            throw new Error('Wipay is not configured');
        }
        try {
            // Query Wipay for transaction status
            const response = await axios_1.default.get(`${this.config.baseUrl}/api/v1/transactions/${transactionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
            });
            const transaction = response.data;
            return {
                success: transaction.status === 'completed' || transaction.status === 'success',
                transactionId: transaction.transaction_id || transactionId,
                amount: parseFloat(transaction.amount || '0'),
                currency: transaction.currency || 'JMD',
                status: transaction.status,
                metadata: transaction.metadata,
            };
        }
        catch (error) {
            if (error.response) {
                throw new Error(`Wipay API error: ${error.response.data?.message || error.message}`);
            }
            throw new Error(`Payment verification failed: ${error.message}`);
        }
    }
    /**
     * Handle Wipay webhook/callback
     * Wipay will POST to this endpoint when payment status changes
     */
    async handleWebhook(payload, signature) {
        if (!this.config) {
            throw new Error('Wipay is not configured');
        }
        try {
            // Verify webhook signature if Wipay provides one
            // Adjust based on Wipay's webhook signature verification method
            // Extract transaction details from webhook payload
            const transactionId = payload.transaction_id || payload.reference || payload.id;
            const status = payload.status || payload.payment_status || payload.paymentStatus;
            if (!transactionId) {
                throw new Error('Missing transaction ID in webhook payload');
            }
            // Return transaction details for route handler to process
            return {
                transactionId,
                status,
                amount: parseFloat(payload.amount || '0'),
                currency: payload.currency || 'JMD',
                metadata: payload.metadata || payload.custom_data || payload,
            };
        }
        catch (error) {
            throw new Error(`Webhook processing failed: ${error.message}`);
        }
    }
    /**
     * Get merchant/public key for frontend (if needed)
     */
    getMerchantId() {
        return this.config?.merchantId || '';
    }
}
exports.default = new PaymentService();
//# sourceMappingURL=payment.service.js.map