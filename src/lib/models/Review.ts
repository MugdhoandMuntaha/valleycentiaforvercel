import mongoose, { Schema, Document, Model } from 'mongoose';

const ReviewImageSchema = new Schema({
    url: { type: String, required: true },
    altText: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
}, { _id: true });

export interface IReviewImage {
    _id: mongoose.Types.ObjectId;
    url: string;
    altText: string | null;
    sortOrder: number;
}

export interface IReviewReport {
    _id?: mongoose.Types.ObjectId;
    userId: string;
    reason: 'spam' | 'offensive' | 'fake' | 'irrelevant';
    details?: string | null;
    createdAt: Date;
}

export interface IReview extends Document {
    _id: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    userId: string;
    userName?: string | null;
    location?: string | null;
    orderItemId: mongoose.Types.ObjectId | null;
    rating: number;
    title: string | null;
    body: string | null;
    isVerified: boolean;
    isApproved: boolean;
    helpfulCount: number;
    images: IReviewImage[];
    // Soft delete & audit trail
    status: 'active' | 'deleted' | 'hidden' | 'reported';
    isDeleted: boolean;
    deletedAt: Date | null;
    deletedBy: string | null;
    deletionReason: string | null;
    // Moderation queue & user reports
    reports: IReviewReport[];
    reportCount: number;
    isReported: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
    {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        userId: { type: String, required: true },
        userName: { type: String, default: null },
        location: { type: String, default: null },
        orderItemId: { type: Schema.Types.ObjectId, default: null },
        rating: { type: Number, required: true, min: 0, max: 5 },
        title: { type: String, default: null },
        body: { type: String, default: null },
        isVerified: { type: Boolean, default: false },
        isApproved: { type: Boolean, default: false },
        helpfulCount: { type: Number, default: 0 },
        images: [ReviewImageSchema],
        status: {
            type: String,
            enum: ['active', 'deleted', 'hidden', 'reported'],
            default: 'active',
            index: true,
        },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: String, default: null },
        deletionReason: { type: String, default: null },
        reports: [
            {
                userId: { type: String, required: true },
                reason: { type: String, enum: ['spam', 'offensive', 'fake', 'irrelevant'], required: true },
                details: { type: String, default: null },
                createdAt: { type: Date, default: Date.now },
            }
        ],
        reportCount: { type: Number, default: 0 },
        isReported: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

ReviewSchema.index({ productId: 1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ productId: 1, rating: 1 });
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
ReviewSchema.index({ isDeleted: 1, status: 1 });
ReviewSchema.index({ isReported: 1, reportCount: -1 });

const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
export default Review;
