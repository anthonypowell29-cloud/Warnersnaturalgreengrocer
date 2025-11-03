"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatJMD = exports.centsToDollars = exports.dollarsToCents = void 0;
/**
 * Convert dollars to cents for payment processing
 * @param dollars - Amount in JMD dollars
 * @returns Amount in cents
 */
const dollarsToCents = (dollars) => {
    return Math.round(dollars * 100);
};
exports.dollarsToCents = dollarsToCents;
/**
 * Convert cents to dollars
 * @param cents - Amount in cents
 * @returns Amount in dollars
 */
const centsToDollars = (cents) => {
    return cents / 100;
};
exports.centsToDollars = centsToDollars;
/**
 * Format number as JMD currency string
 * @param amount - Amount in JMD
 * @returns Formatted string (e.g., "JMD 1,500.00")
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
//# sourceMappingURL=currency.util.js.map