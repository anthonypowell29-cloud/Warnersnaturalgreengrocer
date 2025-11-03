"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cart_controller_1 = require("../controllers/cart.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All cart routes require authentication
router.use(auth_middleware_1.protect);
router
    .route('/')
    .get(cart_controller_1.getCart)
    .delete(cart_controller_1.clearCart);
router
    .route('/items')
    .post(cart_controller_1.addToCart);
router
    .route('/items/:productId')
    .put(cart_controller_1.updateCartItem)
    .delete(cart_controller_1.removeFromCart);
exports.default = router;
//# sourceMappingURL=cart.routes.js.map