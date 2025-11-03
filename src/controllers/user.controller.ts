import { Request, Response } from 'express';
import User from '../models/User.model';
import { uploadImage } from '../services/image.service';

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getProfile = async (req: Request, res: Response): Promise<void> => {
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

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { displayName, phoneNumber } = req.body;

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

  // Update fields
  if (displayName) user.displayName = displayName;
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

  await user.save();

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
    },
    message: 'Profile updated successfully',
  });
};

// @desc    Upload profile photo
// @route   POST /api/v1/users/upload-photo
// @access  Private
export const uploadPhoto = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!req.file) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please upload an image file',
      },
    });
    return;
  }

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

  try {
    // Upload to Cloudinary
    const uploadResult = await uploadImage(req.file, 'jamaican-marketplace/users');

    // Delete old photo if exists (optional - can be done later)
    // if (user.photoURL) {
    //   // Extract publicId from old URL and delete
    // }

    // Update user photo URL
    user.photoURL = uploadResult.url;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        photoURL: user.photoURL,
      },
      message: 'Photo uploaded successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message || 'Failed to upload photo',
      },
    });
  }
};

// @desc    Add address
// @route   POST /api/v1/users/addresses
// @access  Private
export const addAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { street, city, parish, postalCode, isDefault } = req.body;

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

  // If this is set as default, unset all other defaults
  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  // Add new address
  user.addresses.push({
    street,
    city,
    parish,
    postalCode,
    isDefault: isDefault || false,
  });

  await user.save();

  res.status(201).json({
    success: true,
    data: {
      addresses: user.addresses,
    },
    message: 'Address added successfully',
  });
};

// @desc    Update address
// @route   PUT /api/v1/users/addresses/:addressId
// @access  Private
export const updateAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { addressId } = req.params;
  const { street, city, parish, postalCode, isDefault } = req.body;

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

  const addressIndex = user.addresses.findIndex(
    (addr: any) => String(addr._id) === addressId
  );

  if (addressIndex === -1) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Address not found',
      },
    });
    return;
  }

  // If setting as default, unset all other defaults
  if (isDefault) {
    user.addresses.forEach((addr, index) => {
      if (index !== addressIndex) {
        addr.isDefault = false;
      }
    });
  }

  // Update address
  if (street) user.addresses[addressIndex].street = street;
  if (city) user.addresses[addressIndex].city = city;
  if (parish) user.addresses[addressIndex].parish = parish;
  if (postalCode) user.addresses[addressIndex].postalCode = postalCode;
  if (isDefault !== undefined) user.addresses[addressIndex].isDefault = isDefault;

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      addresses: user.addresses,
    },
    message: 'Address updated successfully',
  });
};

// @desc    Delete address
// @route   DELETE /api/v1/users/addresses/:addressId
// @access  Private
export const deleteAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { addressId } = req.params;

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

  const addressIndex = user.addresses.findIndex(
    (addr: any) => String(addr._id) === addressId
  );

  if (addressIndex === -1) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Address not found',
      },
    });
    return;
  }

  user.addresses.splice(addressIndex, 1);
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      addresses: user.addresses,
    },
    message: 'Address deleted successfully',
  });
};

