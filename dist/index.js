"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const error_middleware_1 = require("./middleware/error.middleware");
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const cart_routes_1 = __importDefault(require("./routes/cart.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const app = (0, express_1.default)();
// Connect to database
(0, database_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Logging
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});
// Initialize payment service
const payment_service_1 = require("./services/payment.service");
// Initialize WIpay payment service
try {
    if (process.env.WIPAY_MERCHANT_ID) {
        payment_service_1.paymentService.initialize({
            merchantId: process.env.WIPAY_MERCHANT_ID,
            merchantKey: process.env.WIPAY_MERCHANT_KEY || '',
            secretKey: process.env.WIPAY_SECRET_KEY || '',
            publicKey: process.env.WIPAY_PUBLIC_KEY || '',
            environment: process.env.WIPAY_ENVIRONMENT || 'sandbox',
        });
        console.log('✅ WIpay payment service initialized');
    }
    else {
        console.warn('⚠️  WIpay credentials not configured. Payment features will not work.');
        console.warn('   Set WIPAY_MERCHANT_ID, WIPAY_MERCHANT_KEY, WIPAY_SECRET_KEY, and WIPAY_PUBLIC_KEY in .env');
    }
}
catch (error) {
    console.error('Failed to initialize payment service:', error.message);
}
// API Routes
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/users', user_routes_1.default);
app.use('/api/v1/products', product_routes_1.default);
app.use('/api/v1/cart', cart_routes_1.default);
app.use('/api/v1/orders', order_routes_1.default);
app.use('/api/v1/payments', payment_routes_1.default);
app.use('/api/v1/reviews', review_routes_1.default);
app.use('/api/v1/messages', message_routes_1.default);
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
app.use(error_middleware_1.errorHandler);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
//# sourceMappingURL=index.js.map