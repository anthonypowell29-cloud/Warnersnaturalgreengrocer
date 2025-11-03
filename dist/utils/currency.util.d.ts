/**
 * Format amount as Jamaican Dollars (JMD)
 */
export declare const formatJMD: (amount: number) => string;
/**
 * Format amount as JMD without currency symbol (for display)
 */
export declare const formatJMDNumber: (amount: number) => string;
/**
 * Convert amount to cents (for Stripe - they use amount in smallest currency unit)
 * JMD doesn't have cents, but Stripe expects the amount * 100
 */
export declare const toStripeAmount: (amount: number) => number;
/**
 * Convert from Stripe amount (cents) back to JMD
 */
export declare const fromStripeAmount: (amount: number) => number;
//# sourceMappingURL=currency.util.d.ts.map