import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.model';
import { generateToken } from '../utils/jwt.util';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, displayName, userType, phoneNumber } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
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
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  // Only farmers need verification, buyers are automatically verified
  const isVerified = userType === 'buyer';
  
  const user = await User.create({
    email,
    password: hashedPassword,
    displayName,
    userType,
    phoneNumber,
    isVerified,
  });

  // Only generate token for verified users (buyers are automatically verified)
  // Farmers need to wait for admin verification before they can log in
  let token = null;
  if (isVerified) {
    token = generateToken({
      userId: String(user._id),
      email: user.email,
      userType: user.userType,
    });
  }

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
        isVerified: user.isVerified,
      },
      token: token || undefined, // Only include token if user is verified
    },
    message: userType === 'buyer' 
      ? 'User registered successfully' 
      : 'User registered successfully. Your account is pending verification. Please wait for admin approval before logging in.',
  });
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');

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
  const isMatch = await bcrypt.compare(password, user.password);
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

  // Check if farmer is verified (buyers are automatically verified)
  if (user.userType === 'farmer' && !user.isVerified) {
    res.status(403).json({
      success: false,
      error: {
        code: 'ACCOUNT_PENDING',
        message: 'Your account is pending verification. Please wait for admin approval before logging in.',
      },
    });
    return;
  }

  // Check if user is banned
  if (user.isBanned) {
    res.status(403).json({
      success: false,
      error: {
        code: 'ACCOUNT_BANNED',
        message: 'Your account has been banned. Please contact support.',
      },
    });
    return;
  }

  // Generate token
  const token = generateToken({
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
        isVerified: user.isVerified,
      },
      token,
    },
    message: 'Login successful',
  });
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists for security
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    });
    return;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetPasswordToken = crypto
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

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token, password } = req.body;

  // Hash token to compare with stored hash
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
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
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
  });
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  const user = await User.findById(userId);

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

