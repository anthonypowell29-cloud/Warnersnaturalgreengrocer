"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const cart_controller_1 = require("../controllers/cart.controller");
const router = (0, express_1.Router)();
// All cart routes require authentication
router.use(auth_middleware_1.authenticate);
router.route('/').get(cart_controller_1.getCart).delete(cart_controller_1.clearCart);
router.route('/items').post(cart_controller_1.addItem);
router.route('/items/:productId').put(cart_controller_1.updateItem).delete(cart_controller_1.removeItem);
exports.default = router;
//# sourceMappingURL=cart.routes.js.map