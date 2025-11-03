"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const axios_1 = __importDefault(require("axios"));
class PaymentService {
    constructor() {
        this.config = null;
        this.apiClient = null;
    }
    /**
     * Initialize WIpay configuration
     */
    initialize(config) {
        this.config = config;
        const baseURL = config.environment === 'production'
            ? 'https://api.wipay.com/v1'
            : 'https://sandbox.wipay.com/v1';
        this.apiClient = axios_1.default.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
                'X-Merchant-Id': config.merchantId,
                'X-Merchant-Key': config.merchantKey,
                Authorization: `Bearer ${config.secretKey}`,
            },
            timeout: 30000,
        });
    }
    /**
     * Create a payment request
     */
    async createPayment(request) {
        if (!this.config || !this.apiClient) {
            throw new Error('Payment service not initialized. Please configure WIpay credentials.');
        }
        try {
            const response = await this.apiClient.post('/payments', {
                amount: request.amount,
                currency: request.currency || 'JMD',
                order_id: request.orderId,
                customer_email: request.customerEmail,
                customer_name: request.customerName,
                description: request.description || 'Jamaican Marketplace Order',
                return_url: request.returnUrl,
                cancel_url: request.cancelUrl,
            });
            return {
                transactionId: response.data.transaction_id || response.data.id,
                paymentUrl: response.data.payment_url || response.data.checkout_url,
                reference: response.data.reference || response.data.transaction_id,
                status: 'pending',
            };
        }
        catch (error) {
            throw new Error(`WIpay payment creation failed: ${error.response?.data?.message || error.message}`);
        }
    }
    /**
     * Verify a payment transaction
     */
    async verifyPayment(transactionId) {
        if (!this.config || !this.apiClient) {
            throw new Error('Payment service not initialized. Please configure WIpay credentials.');
        }
        try {
            const response = await this.apiClient.get(`/payments/${transactionId}`);
            return {
                transactionId: response.data.transaction_id || response.data.id,
                reference: response.data.reference || response.data.transaction_id,
                status: response.data.status === 'completed' ? 'success' : 'failed',
                amount: response.data.amount,
                currency: response.data.currency || 'JMD',
                metadata: response.data,
            };
        }
        catch (error) {
            throw new Error(`WIpay payment verification failed: ${error.response?.data?.message || error.message}`);
        }
    }
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(data, signature) {
        if (!this.config) {
            return false;
        }
        // WIpay webhook signature verification
        // Implementation depends on WIpay's webhook signature method
        // This is a placeholder - update based on WIpay documentation
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', this.config.secretKey)
            .update(JSON.stringify(data))
            .digest('hex');
        return expectedSignature === signature;
    }
}
exports.paymentService = new PaymentService();
//# sourceMappingURL=payment.service.js.map