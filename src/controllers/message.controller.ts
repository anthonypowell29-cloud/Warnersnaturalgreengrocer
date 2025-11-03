import { Request, Response } from 'express';
import Message from '../models/Message.model';
import Order from '../models/Order.model';
import { TokenPayload } from '../utils/jwt.util';

interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { userId?: string };
}

// @desc    Get messages for an order
// @route   GET /api/v1/messages/order/:orderId
// @access  Private
export const getOrderMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { orderId } = req.params;

    // Verify user is part of this order
    const order = await Order.findById(orderId);
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

    if (order.buyerId.toString() !== userId && order.sellerId?.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this conversation',
        },
      });
      return;
    }

    const messages = await Message.find({ orderId })
      .populate('senderId', 'displayName photoURL')
      .populate('recipientId', 'displayName photoURL')
      .sort({ createdAt: 1 });

    // Mark messages as read if user is recipient
    await Message.updateMany(
      { orderId, recipientId: userId, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch messages',
      },
    });
  }
};

// @desc    Send a message
// @route   POST /api/v1/messages
// @access  Private
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { orderId, message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message content is required',
        },
      });
      return;
    }

    // Verify user is part of this order
    const order = await Order.findById(orderId);
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

    const isBuyer = order.buyerId.toString() === userId;
    const isSeller = order.sellerId?.toString() === userId;

    if (!isBuyer && !isSeller) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this conversation',
        },
      });
      return;
    }

    // Determine recipient
    const recipientId = isBuyer ? order.sellerId : order.buyerId;
    if (!recipientId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER',
          message: 'Order is missing seller information',
        },
      });
      return;
    }

    const newMessage = await Message.create({
      orderId,
      senderId: userId,
      recipientId,
      message: message.trim(),
    });

    await newMessage.populate('senderId', 'displayName photoURL');
    await newMessage.populate('recipientId', 'displayName photoURL');

    // TODO: Send push notification to recipient

    res.status(201).json({
      success: true,
      data: newMessage,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to send message',
      },
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/v1/messages/unread
// @access  Private
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';

    const count = await Message.countDocuments({
      recipientId: userId,
      read: false,
    });

    res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch unread count',
      },
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/v1/messages/read
// @access  Private
export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const { orderId, messageIds } = req.body;

    const updateQuery: any = {
      recipientId: userId,
      read: false,
    };

    if (orderId) {
      updateQuery.orderId = orderId;
    }

    if (messageIds && Array.isArray(messageIds)) {
      updateQuery._id = { $in: messageIds };
    }

    await Message.updateMany(updateQuery, { read: true });

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to mark messages as read',
      },
    });
  }
};

