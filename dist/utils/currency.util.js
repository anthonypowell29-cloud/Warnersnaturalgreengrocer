"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromStripeAmount = exports.toStripeAmount = exports.formatJMDNumber = exports.formatJMD = void 0;
/**
 * Format amount as Jamaican Dollars (JMD)
 */
const formatJMD = (amount) => {
    return new Intl.NumberFormat('en-JM', {
        style: 'currency',
        currency: 'JMD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};
exports.formatJMD = formatJMD;
/**
 * Format amount as JMD without currency symbol (for display)
 */
const formatJMDNumber = (amount) => {
    return new Intl.NumberFormat('en-JM', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};
exports.formatJMDNumber = formatJMDNumber;
/**
 * Convert amount to cents (for Stripe - they use amount in smallest currency unit)
 * JMD doesn't have cents, but Stripe expects the amount * 100
 */
const toStripeAmount = (amount) => {
    // Stripe uses amount in smallest currency unit
    // For JMD, we multiply by 100 to get cents equivalent
    return Math.round(amount * 100);
};
exports.toStripeAmount = toStripeAmount;
/**
 * Convert from Stripe amount (cents) back to JMD
 */
const fromStripeAmount = (amount) => {
    return amount / 100;
};
exports.fromStripeAmount = fromStripeAmount;
//# sourceMappingURL=currency.util.js.map