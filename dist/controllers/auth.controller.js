"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const User_model_1 = __importDefault(require("../models/User.model"));
const jwt_util_1 = require("../utils/jwt.util");
// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
const register = async (req, res) => {
    const { email, password, displayName, userType, phoneNumber } = req.body;
    // Check if user exists
    const existingUser = await User_model_1.default.findOne({ email });
    if (existingUser) {
        res.status(400).json({
            success: false,
            error: {
                code: 'DUPLICATE_ERROR',
                message: 'User already exists with this email',
            },
        });
        return;
    }
    // Hash password
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    // Create user
    const user = await User_model_1.default.create({
        email,
        password: hashedPassword,
        displayName,
        userType,
        phoneNumber,
    });
    // Generate token
    const token = (0, jwt_util_1.generateToken)({
        userId: String(user._id),
        email: user.email,
        userType: user.userType,
    });
    res.status(201).json({
        success: true,
        data: {
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                userType: user.userType,
                photoURL: user.photoURL,
                phoneNumber: user.phoneNumber,
            },
            token,
        },
        message: 'User registered successfully',
    });
};
exports.register = register;
// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res) => {
    const { email, password } = req.body;
    // Find user and include password
    const user = await User_model_1.default.findOne({ email }).select('+password');
    if (!user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid credentials',
            },
        });
        return;
    }
    // Check password
    const isMatch = await bcryptjs_1.default.compare(password, user.password);
    if (!isMatch) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid credentials',
            },
        });
        return;
    }
    // Generate token
    const token = (0, jwt_util_1.generateToken)({
        userId: String(user._id),
        email: user.email,
        userType: user.userType,
    });
    res.status(200).json({
        success: true,
        data: {
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                userType: user.userType,
                photoURL: user.photoURL,
                phoneNumber: user.phoneNumber,
            },
            token,
        },
        message: 'Login successful',
    });
};
exports.login = login;
// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User_model_1.default.findOne({ email });
    if (!user) {
        // Don't reveal if user exists for security
        res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent',
        });
        return;
    }
    // Generate reset token
    const resetToken = crypto_1.default.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto_1.default
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();
    // TODO: Send email with reset token
    // For now, log it (in production, send email)
    console.log(`Reset token for ${email}: ${resetToken}`);
    res.status(200).json({
        success: true,
        message: 'Password reset email sent',
        // In production, remove this
        data: { resetToken }, // Remove in production
    });
};
exports.forgotPassword = forgotPassword;
// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    // Hash token to compare with stored hash
    const resetPasswordToken = crypto_1.default
        .createHash('sha256')
        .update(token)
        .digest('hex');
    const user = await User_model_1.default.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
        res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired reset token',
            },
        });
        return;
    }
    // Hash password
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({
        success: true,
        message: 'Password reset successful',
    });
};
exports.resetPassword = resetPassword;
// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res) => {
    const userId = req.user?.userId;
    const user = await User_model_1.default.findById(userId);
    if (!user) {
        res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'User not found',
            },
        });
        return;
    }
    res.status(200).json({
        success: true,
        data: {
            _id: user._id,
            email: user.email,
            displayName: user.displayName,
            userType: user.userType,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
            addresses: user.addresses,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
    });
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map