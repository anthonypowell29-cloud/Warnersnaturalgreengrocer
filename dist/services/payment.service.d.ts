export interface WIpayConfig {
    merchantId: string;
    merchantKey: string;
    secretKey: string;
    publicKey: string;
    environment: 'sandbox' | 'production';
}
export interface WIpayPaymentRequest {
    amount: number;
    currency: string;
    orderId: string;
    customerEmail: string;
    customerName?: string;
    description?: string;
    returnUrl?: string;
    cancelUrl?: string;
}
export interface WIpayPaymentResponse {
    transactionId: string;
    paymentUrl: string;
    reference: string;
    status: 'pending' | 'success' | 'failed';
}
export interface WIpayWebhookData {
    transactionId: string;
    reference: string;
    status: 'success' | 'failed';
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
}
declare class PaymentService {
    private config;
    private apiClient;
    /**
     * Initialize WIpay configuration
     */
    initialize(config: WIpayConfig): void;
    /**
     * Create a payment request
     */
    createPayment(request: WIpayPaymentRequest): Promise<WIpayPaymentResponse>;
    /**
     * Verify a payment transaction
     */
    verifyPayment(transactionId: string): Promise<WIpayWebhookData>;
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(data: any, signature: string): boolean;
}
export declare const paymentService: PaymentService;
export {};
//# sourceMappingURL=payment.service.d.ts.map