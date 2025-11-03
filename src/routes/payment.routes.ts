import { Router } from 'express';
import { handleWebhook } from '../controllers/payment.controller';

const router = Router();

// Webhook endpoint (public, but signature verified)
router.post('/webhook', handleWebhook);

export default router;
