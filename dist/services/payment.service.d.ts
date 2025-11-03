export interface InitializePaymentData {
    email: string;
    amount: number;
    orderNumber: string;
    orderId: string;
    buyerId: string;
    description?: string;
    customerName?: string;
    phone?: string;
}
export interface PaymentResponse {
    paymentUrl: string;
    transactionId: string;
    orderId?: string;
}
export interface VerifyPaymentResponse {
    success: boolean;
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    metadata?: any;
}
declare class PaymentService {
    private config;
    constructor();
    /**
     * Initialize payment with Wipay
     * Wipay typically uses a redirect-based payment flow
     */
    initializePayment(data: InitializePaymentData): Promise<PaymentResponse>;
    /**
     * Verify payment transaction
     * Typically called via webhook or after redirect
     */
    verifyPayment(transactionId: string): Promise<VerifyPaymentResponse>;
    /**
     * Handle Wipay webhook/callback
     * Wipay will POST to this endpoint when payment status changes
     */
    handleWebhook(payload: any, signature?: string): Promise<any>;
    /**
     * Get merchant/public key for frontend (if needed)
     */
    getMerchantId(): string;
}
declare const _default: PaymentService;
export default _default;
//# sourceMappingURL=payment.service.d.ts.map