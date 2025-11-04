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
    const { shippingAddress, paymentMethod, deliveryOption, notes, shippingFee } = req.body;

    // Validate shipping address if delivery option is selected
    if (deliveryOption !== 'pickup') {
      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.parish || !shippingAddress.postalCode) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ADDRESS',
            message: 'Shipping address is required for delivery',
          },
        });
        return;
      }
    }

    // Get user for payment customer info
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

    // Get cart (don't populate to avoid serialization issues)
    const cart = await Cart.findOne({ userId });
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
      // Get productId - handle both populated and unpopulated cases
      const productId = (cartItem as any).productId?._id || (cartItem as any).productId;
      
      // Fetch product fresh from database to ensure we have latest stock/availability
      const product = await Product.findById(productId).lean();
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

      // Validate all products are from the same seller
      const productSellerId = product.sellerId.toString();
      if (!sellerId) {
        sellerId = productSellerId;
      } else if (sellerId !== productSellerId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MULTIPLE_SELLERS',
            message: 'All items in cart must be from the same seller',
          },
        });
        return;
      }

      orderItems.push({
        productId: product._id,
        quantity: (cartItem as any).quantity,
        price: (cartItem as any).price,
        title: product.title,
      });
    }

    // Calculate shipping fee based on delivery option
    const finalDeliveryOption = deliveryOption || 'delivery';
    const finalShippingFee = finalDeliveryOption === 'pickup' ? 0 : (shippingFee || 500); // Default JMD 500
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
      shippingAddress: deliveryOption === 'pickup' ? {
        street: 'Pickup',
        city: 'N/A',
        parish: 'N/A',
        postalCode: 'N/A',
      } : {
        street: shippingAddress.street,
        city: shippingAddress.city,
        parish: shippingAddress.parish,
        postalCode: shippingAddress.postalCode,
      },
      deliveryOption: deliveryOption || 'delivery',
      notes,
      // Initialize status history
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          updatedBy: userId as any,
        },
      ],
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

    // Convert order to plain object to avoid Mongoose serialization issues
    const orderData = order.toObject ? order.toObject() : order;

    res.status(201).json({
      success: true,
      data: {
        order: orderData,
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
      .sort({ createdAt: -1 })
      .lean(); // Use lean() to return plain objects

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
      .populate('sellerId', 'displayName photoURL phoneNumber')
      .lean(); // Use lean() to return plain object

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
      // Convert to plain object to avoid Mongoose serialization issues
      const orderData = order.toObject ? order.toObject() : order;
      
      res.status(200).json({
        success: true,
        data: orderData,
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

    // Convert to plain object to avoid Mongoose serialization issues
    const orderData = order.toObject ? order.toObject() : order;

    res.status(200).json({
      success: true,
      data: orderData,
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

// @desc    Get seller's orders
// @route   GET /api/v1/orders/seller
// @access  Private (Seller only)
export const getSellerOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = { sellerId: userId };
    if (status) {
      query.status = status;
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
      .populate('items.productId', 'title images')
      .populate('buyerId', 'displayName photoURL phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() to return plain objects

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch seller orders',
      },
    });
  }
};

// @desc    Update order status (Seller only)
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Seller only)
export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findById(id);
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

    // Verify seller owns this order
    if (order.sellerId?.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own orders',
        },
      });
      return;
    }

    // Validate status transition
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid order status',
        },
      });
      return;
    }

    // Prevent status downgrades
    const statusOrder = {
      pending: 0,
      confirmed: 1,
      preparing: 2,
      ready: 3,
      delivered: 4,
      cancelled: 5,
    };

    if (statusOrder[status as keyof typeof statusOrder] < statusOrder[order.status as keyof typeof statusOrder]) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Cannot revert order status',
        },
      });
      return;
    }

    // Update status
    const oldStatus = order.status;
    order.status = status as any;

    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: status as any,
      timestamp: new Date(),
      updatedBy: userId as any,
      notes: notes || undefined,
    });

    // Set dates based on status
    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
    } else if (status === 'ready' && order.deliveryOption === 'pickup') {
      order.estimatedDeliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
    } else if (status === 'preparing' && order.deliveryOption === 'delivery') {
      order.estimatedDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    }

    await order.save();

    // TODO: Send push notification to buyer about status update

    // Convert to plain object to avoid Mongoose serialization issues
    const orderData = order.toObject ? order.toObject() : order;

    res.status(200).json({
      success: true,
      data: orderData,
      message: `Order status updated from ${oldStatus} to ${status}`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update order status',
      },
    });
  }
};

// @desc    Get order tracking info
// @route   GET /api/v1/orders/:id/tracking
// @access  Private
export const getOrderTracking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      $or: [{ buyerId: userId }, { sellerId: userId }],
    })
      .populate('buyerId', 'displayName photoURL phoneNumber')
      .populate('sellerId', 'displayName photoURL phoneNumber')
      .populate('items.productId', 'title images');

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
        message: error.message || 'Failed to fetch order tracking',
      },
    });
  }
};

