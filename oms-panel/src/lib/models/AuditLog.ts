import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'VIEW' | 'SUSPEND' | 'REACTIVATE' | 'EXPORT' | 'ANONYMIZE' | 'MERGE';

export interface IAuditLog extends Document {
    tableName: string;
    recordId: string;
    action: AuditAction;
    oldData: Record<string, unknown> | null;
    newData: Record<string, unknown> | null;
    performedBy: string | null;
    metadata?: Record<string, unknown> | null;
    performedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
    tableName: { type: String, required: true },
    recordId: { type: String, required: true },
    action: {
        type: String,
        enum: ['INSERT', 'UPDATE', 'DELETE', 'VIEW', 'SUSPEND', 'REACTIVATE', 'EXPORT', 'ANONYMIZE', 'MERGE'],
        required: true,
    },
    oldData: { type: Schema.Types.Mixed, default: null },
    newData: { type: Schema.Types.Mixed, default: null },
    performedBy: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    performedAt: { type: Date, default: Date.now },
}, { timestamps: false });

AuditLogSchema.index({ tableName: 1 });
AuditLogSchema.index({ recordId: 1 });
AuditLogSchema.index({ performedBy: 1 });
AuditLogSchema.index({ performedAt: -1 });
AuditLogSchema.index({ recordId: 1, performedAt: -1 });

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
