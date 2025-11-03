import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
export declare const getCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const addToCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const updateCartItem: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const removeFromCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const clearCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
//# sourceMappingURL=cart.controller.d.ts.map