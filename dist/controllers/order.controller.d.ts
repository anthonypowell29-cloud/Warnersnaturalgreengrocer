import { Request, Response } from 'express';
import { TokenPayload } from '../utils/jwt.util';
interface AuthenticatedRequest extends Request {
    user?: TokenPayload & {
        userId?: string;
    };
}
export declare const createOrder: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getOrders: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getOrder: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const verifyPayment: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const cancelOrder: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=order.controller.d.ts.map