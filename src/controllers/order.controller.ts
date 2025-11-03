import { Request, Response } from 'express';
import Order from '../models/Order.model';
import Cart from '../models/Cart.model';
import Product from '../models/Product.model';
import Transaction from '../models/Transaction.model';
import User from '../models/User.model';
import { TokenPayload } from '../utils/jwt.util';
import { paymentService } from '../services/payment.service';
import { dollarsToCents } from '../utils/currency.util';

interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { userId?: string };
}

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { shippingAddressId, paymentMethod, notes, shippingFee } = req.body;

    // Get user to fetch shipping address
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Find shipping address
    const shippingAddress = user.addresses.find(
      (addr: any) => addr._id?.toString() === shippingAddressId
    );

    if (!shippingAddress) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Shipping address not found',
        },
      });
      return;
    }

    // Get cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_CART',
          message: 'Cart is empty',
        },
      });
      return;
    }

    // Validate products and get seller
    let sellerId: string | undefined;
    const orderItems = [];

    for (const cartItem of cart.items) {
      const product = await Product.findById((cartItem as any).productId);
      if (!product || !product.available || product.stock < (cartItem as any).quantity) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PRODUCT_UNAVAILABLE',
            message: `Product ${product?.title || 'unknown'} is not available`,
          },
        });
        return;
      }

      if (!sellerId) {
        sellerId = product.sellerId.toString();
      }

      orderItems.push({
        productId: product._id,
        quantity: (cartItem as any).quantity,
        price: (cartItem as any).price,
        title: product.title,
      });
    }

    const finalShippingFee = shippingFee || 500; // Default JMD 500
    const subtotal = cart.subtotal;
    const totalAmount = subtotal + finalShippingFee;

    // Create order
    const order = await Order.create({
      buyerId: userId,
      sellerId,
      items: orderItems,
      subtotal,
      shippingFee: finalShippingFee,
      totalAmount,
      paymentMethod,
      paymentGateway: paymentMethod === 'card' ? 'wipay' : 'bank_transfer',
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        parish: shippingAddress.parish,
        postalCode: shippingAddress.postalCode,
      },
      notes,
    });

    // Handle payment based on method
    let paymentData = null;

    if (paymentMethod === 'card') {
      try {
        // Initialize WIpay payment
        const paymentRequest = await paymentService.createPayment({
          amount: totalAmount,
          currency: 'JMD',
          orderId: order.orderNumber,
          customerEmail: user.email,
          customerName: user.displayName,
          description: `Order ${order.orderNumber}`,
          returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/order-confirmation?orderId=${order._id}`,
          cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/checkout?cancelled=true`,
        });

        // Create transaction record
        await Transaction.create({
          orderId: order._id,
          amount: totalAmount,
          currency: 'JMD',
          paymentGateway: 'wipay',
          paymentReference: paymentRequest.reference,
          gatewayTransactionId: paymentRequest.transactionId,
          status: 'pending',
        });

        // Update order with payment reference
        order.paymentReference = paymentRequest.reference;
        await order.save();

        paymentData = {
          paymentUrl: paymentRequest.paymentUrl,
          transactionId: paymentRequest.transactionId,
          reference: paymentRequest.reference,
        };
      } catch (paymentError: any) {
        // If payment initialization fails, still create order but mark as failed
        order.paymentStatus = 'failed';
        await order.save();

        res.status(500).json({
          success: false,
          error: {
            code: 'PAYMENT_INIT_FAILED',
            message: paymentError.message || 'Failed to initialize payment',
          },
        });
        return;
      }
    } else {
      // Bank transfer - create transaction record
      await Transaction.create({
        orderId: order._id,
        amount: totalAmount,
        currency: 'JMD',
        paymentGateway: 'bank_transfer',
        paymentReference: order.orderNumber,
        status: 'pending',
      });
    }

    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        order,
        payment: paymentData,
      },
      message: 'Order created successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create order',
      },
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/v1/orders
// @access  Private
export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { status } = req.query;

    const query: any = { buyerId: userId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('items.productId', 'title images')
      .populate('sellerId', 'displayName photoURL')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch orders',
      },
    });
  }
};

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
export const getOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, buyerId: userId })
      .populate('items.productId', 'title images price')
      .populate('sellerId', 'displayName photoURL phoneNumber');

    if (!order) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch order',
      },
    });
  }
};

// @desc    Verify payment for order
// @route   POST /api/v1/orders/:id/verify-payment
// @access  Private
export const verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { id } = req.params;
    const { reference } = req.body;

    const order = await Order.findOne({ _id: id, buyerId: userId });
    if (!order) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
      return;
    }

    if (order.paymentStatus === 'paid') {
      res.status(200).json({
        success: true,
        data: order,
        message: 'Payment already verified',
      });
      return;
    }

    // Verify payment with WIpay
    if (order.paymentGateway === 'wipay' && reference) {
      const verification = await paymentService.verifyPayment(reference);

      if (verification.status === 'success') {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';

        // Update transaction
        await Transaction.findOneAndUpdate(
          { orderId: order._id },
          { status: 'success', metadata: verification.metadata }
        );
      } else {
        order.paymentStatus = 'failed';
        await Transaction.findOneAndUpdate(
          { orderId: order._id },
          { status: 'failed' }
        );
      }

      await order.save();
    }

    res.status(200).json({
      success: true,
      data: order,
      message: 'Payment verification completed',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to verify payment',
      },
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, buyerId: userId });
    if (!order) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
      return;
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Order cannot be cancelled',
        },
      });
      return;
    }

    order.status = 'cancelled';

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order cancelled successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to cancel order',
      },
    });
  }
};

