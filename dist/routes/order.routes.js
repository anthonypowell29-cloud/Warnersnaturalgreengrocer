"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const order_controller_1 = require("../controllers/order.controller");
const router = (0, express_1.Router)();
// All order routes require authentication
router.use(auth_middleware_1.authenticate);
router.route('/').get(order_controller_1.getOrders).post(order_controller_1.createOrder);
router.route('/:id').get(order_controller_1.getOrder);
router.route('/:id/verify-payment').post(order_controller_1.verifyPayment);
router.route('/:id/cancel').put(order_controller_1.cancelOrder);
exports.default = router;
//# sourceMappingURL=order.routes.js.map