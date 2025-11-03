export interface TokenPayload {
    userId: string;
    email: string;
    userType: 'buyer' | 'farmer';
}
export declare const generateToken: (payload: TokenPayload) => string;
export declare const verifyToken: (token: string) => TokenPayload;
//# sourceMappingURL=jwt.util.d.ts.map