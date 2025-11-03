import { Request, Response } from 'express';
import Order from '../models/Order.model';
import Transaction from '../models/Transaction.model';
import { paymentService } from '../services/payment.service';

// @desc    Handle payment webhook from WIpay
// @route   POST /api/v1/payments/webhook
// @access  Public (webhook endpoint)
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-wipay-signature'] as string;
    const webhookData = req.body;

    // Verify webhook signature
    if (!paymentService.verifyWebhookSignature(webhookData, signature)) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature',
        },
      });
      return;
    }

    const { transactionId, reference, status, amount } = webhookData;

    // Find transaction by reference or transaction ID
    const transaction = await Transaction.findOne({
      $or: [{ paymentReference: reference }, { gatewayTransactionId: transactionId }],
    });

    if (!transaction) {
      console.warn(`Transaction not found for reference: ${reference}`);
      res.status(404).json({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transaction not found',
        },
      });
      return;
    }

    // Update transaction status
    transaction.status = status === 'success' ? 'success' : 'failed';
    transaction.metadata = webhookData;
    await transaction.save();

    // Update order status
    const order = await Order.findById(transaction.orderId);
    if (order) {
      if (status === 'success') {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.paymentReference = reference;
      } else {
        order.paymentStatus = 'failed';
      }
      await order.save();
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to process webhook',
      },
    });
  }
};

