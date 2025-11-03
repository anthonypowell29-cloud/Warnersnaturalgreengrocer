import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
export declare const createOrder: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getOrders: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getOrder: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const verifyPayment: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const updateOrderStatus: (req: AuthenticatedRequest, res: Response) => Promise<void>;
//# sourceMappingURL=order.controller.d.ts.map