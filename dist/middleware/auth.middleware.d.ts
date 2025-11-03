import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../utils/jwt.util';
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}
export interface AuthenticatedRequest extends Request {
    user?: TokenPayload;
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
export declare const authorize: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const protect: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map