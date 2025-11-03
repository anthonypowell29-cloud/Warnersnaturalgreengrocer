"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const router = (0, express_1.Router)();
// Webhook endpoint (public, but signature verified)
router.post('/webhook', payment_controller_1.handleWebhook);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map