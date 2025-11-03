import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  displayName: string;
  photoURL?: string;
  userType: 'buyer' | 'farmer' | 'admin';
  phoneNumber?: string;
  addresses: {
    street: string;
    city: string;
    parish: string;
    postalCode: string;
    isDefault: boolean;
  }[];
  isVerified: boolean;
  isBanned?: boolean; // For admin to ban users
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    parish: { type: String, required: true },
    postalCode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  {
    _id: true, // Enable _id for subdocuments
  }
);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please add a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    displayName: {
      type: String,
      required: [true, 'Please add a display name'],
      trim: true,
    },
    photoURL: {
      type: String,
    },
    userType: {
      type: String,
      enum: ['buyer', 'farmer', 'admin'],
      required: [true, 'Please select user type'],
    },
    phoneNumber: {
      type: String,
    },
    addresses: {
      type: [AddressSchema],
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ userType: 1 });

export default mongoose.model<IUser>('User', UserSchema);

