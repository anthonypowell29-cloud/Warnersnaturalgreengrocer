import { Request, Response } from 'express';
import { TokenPayload } from '../utils/jwt.util';
interface AuthenticatedRequest extends Request {
    user?: TokenPayload & {
        userId?: string;
    };
}
export declare const getCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const addItem: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const updateItem: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const removeItem: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const clearCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=cart.controller.d.ts.map