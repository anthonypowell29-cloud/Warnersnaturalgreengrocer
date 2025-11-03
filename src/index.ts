import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/database';
import { errorHandler } from './middleware/error.middleware';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import reviewRoutes from './routes/review.routes';
import messageRoutes from './routes/message.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Initialize payment service
import { paymentService } from './services/payment.service';

// Initialize WIpay payment service
try {
  if (process.env.WIPAY_MERCHANT_ID) {
    paymentService.initialize({
      merchantId: process.env.WIPAY_MERCHANT_ID,
      merchantKey: process.env.WIPAY_MERCHANT_KEY || '',
      secretKey: process.env.WIPAY_SECRET_KEY || '',
      publicKey: process.env.WIPAY_PUBLIC_KEY || '',
      environment: (process.env.WIPAY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    });
    console.log('✅ WIpay payment service initialized');
  } else {
    console.warn('⚠️  WIpay credentials not configured. Payment features will not work.');
    console.warn('   Set WIPAY_MERCHANT_ID, WIPAY_MERCHANT_KEY, WIPAY_SECRET_KEY, and WIPAY_PUBLIC_KEY in .env');
  }
} catch (error: any) {
  console.error('Failed to initialize payment service:', error.message);
}

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

