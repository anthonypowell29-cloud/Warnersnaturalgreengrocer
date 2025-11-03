/**
 * Convert dollars to cents for payment processing
 * @param dollars - Amount in JMD dollars
 * @returns Amount in cents
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Convert cents to dollars
 * @param cents - Amount in cents
 * @returns Amount in dollars
 */
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

/**
 * Format number as JMD currency string
 * @param amount - Amount in JMD
 * @returns Formatted string (e.g., "JMD 1,500.00")
 */
export const formatJMD = (amount: number): string => {
  return new Intl.NumberFormat('en-JM', {
    style: 'currency',
    currency: 'JMD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

