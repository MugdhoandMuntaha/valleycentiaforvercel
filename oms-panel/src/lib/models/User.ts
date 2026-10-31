import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'customer' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface IUserStatusHistory {
    status: UserStatus;
    note: string | null;
    changedBy: string | null;
    createdAt: Date;
}

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    clerkId: string | null;
    email: string;
    password?: string; // Optional for OAuth users
    fullName: string | null;
    displayName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    role: UserRole;
    status: UserStatus;
    statusHistory: IUserStatusHistory[];
    lastLoginAt: Date | null;
    isAnonymized: boolean;
    permissions: string[];
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    provider: 'credentials' | 'google' | 'clerk';
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserStatusHistorySchema = new Schema(
    {
        status: { type: String, enum: ['active', 'suspended'], required: true },
        note: { type: String, default: null },
        changedBy: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const UserSchema = new Schema<IUser>(
    {
        clerkId: { type: String, default: null, unique: true, sparse: true },
        email: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true },
        password: { type: String, select: false }, // Excluded from queries by default
        fullName: { type: String, default: null },
        displayName: { type: String, default: null },
        phone: { type: String, default: null },
        avatarUrl: { type: String, default: null },
        dateOfBirth: { type: Date, default: null },
        gender: { type: String, default: null },
        role: { type: String, enum: ['customer', 'admin'], default: 'customer', lowercase: true, trim: true },
        status: { type: String, enum: ['active', 'suspended'], default: 'active', lowercase: true, trim: true },
        statusHistory: [UserStatusHistorySchema],
        lastLoginAt: { type: Date, default: null },
        isAnonymized: { type: Boolean, default: false },
        permissions: { type: [String], default: [] },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        provider: { type: String, enum: ['credentials', 'google', 'clerk'], default: 'clerk' },
    },
    { timestamps: true }
);

// Indexes
UserSchema.index({ phone: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
