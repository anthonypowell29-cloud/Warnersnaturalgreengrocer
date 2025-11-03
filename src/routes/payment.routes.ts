import { Router, Request, Response } from 'express';
import paymentService from '../services/payment.service';
import Order from '../models/Order.model';

const router = Router();

/**
 * Stripe webhook endpoint
 * Note: This route must be registered with express.raw() middleware in index.ts
 */
router.post(
  '/webhook',
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing Stripe signature',
        },
      });
      return;
    }

    try {
      await paymentService.handleWebhook(req.body, sig as string);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: error.message,
        },
      });
    }
  }
);

/**
 * Get Stripe publishable key
 */
router.get('/config', (req: Request, res: Response): void => {
  const publishableKey = paymentService.getPublishableKey();
  
  res.status(200).json({
    success: true,
    data: {
      publishableKey,
    },
  });
});

export default router;

