import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGuestAddress {
    _id?: mongoose.Types.ObjectId;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    country: string;
    createdAt: Date;
}

export interface IGuestChangeHistory {
    _id?: mongoose.Types.ObjectId;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Date;
    reason?: string | null;
}

export interface IGuestOrderMetadata {
    _id?: mongoose.Types.ObjectId;
    orderId: string;
    ip?: string | null;
    userAgent?: string | null;
    createdAt: Date;
}

export interface IGuest extends Document {
    _id: mongoose.Types.ObjectId;
    phone: string; // Unique, E.164-normalized
    name: string | null;
    email: string | null;
    status: 'active' | 'suspended';
    firstSeen: Date;
    lastSeen: Date;
    orderCount: number;
    totalSpend: number;
    orderIds: mongoose.Types.ObjectId[];
    orderMetadata: IGuestOrderMetadata[];
    addresses: IGuestAddress[];
    changeHistory: IGuestChangeHistory[];
    isMerged: boolean;
    mergedToUserId: string | null;
    mergedAt: Date | null;
    retentionExpiresAt: Date | null;
    isAnonymized: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const GuestAddressSchema = new Schema(
    {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        addressLine1: { type: String, required: true },
        addressLine2: { type: String, default: null },
        city: { type: String, required: true },
        state: { type: String, default: null },
        postalCode: { type: String, default: null },
        country: { type: String, default: 'Bangladesh' },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const GuestChangeHistorySchema = new Schema(
    {
        field: { type: String, required: true },
        oldValue: { type: String, default: null },
        newValue: { type: String, default: null },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String, default: null },
    },
    { _id: true }
);

const GuestOrderMetadataSchema = new Schema(
    {
        orderId: { type: String, required: true },
        ip: { type: String, default: null },
        userAgent: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const GuestSchema = new Schema<IGuest>(
    {
        phone: { type: String, required: true, unique: true },
        name: { type: String, default: null },
        email: { type: String, default: null, lowercase: true, trim: true },
        status: { type: String, enum: ['active', 'suspended'], default: 'active', lowercase: true, trim: true },
        firstSeen: { type: Date, default: Date.now },
        lastSeen: { type: Date, default: Date.now },
        orderCount: { type: Number, default: 0, min: 0 },
        totalSpend: { type: Number, default: 0, min: 0 },
        orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order', default: [] }],
        orderMetadata: [GuestOrderMetadataSchema],
        addresses: [GuestAddressSchema],
        changeHistory: [GuestChangeHistorySchema],
        isMerged: { type: Boolean, default: false },
        mergedToUserId: { type: String, default: null },
        mergedAt: { type: Date, default: null },
        retentionExpiresAt: { type: Date, default: null },
        isAnonymized: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Indexes
GuestSchema.index({ status: 1 });
GuestSchema.index({ lastSeen: -1 });
GuestSchema.index({ createdAt: -1 });
GuestSchema.index({ totalSpend: -1 });
GuestSchema.index({ orderCount: -1 });
GuestSchema.index({ retentionExpiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const Guest: Model<IGuest> = mongoose.models.Guest || mongoose.model<IGuest>('Guest', GuestSchema);
export default Guest;
