import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SelfieEntryDocument = HydratedDocument<SelfieEntry>;
export type SelfieModerationStatus = 'pending' | 'approved' | 'rejected';

@Schema({ timestamps: true })
export class SelfieEntry {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  dateKey: string;

  @Prop({ default: false })
  showToOthers: boolean;

  @Prop({ default: 'pending' })
  moderationStatus: SelfieModerationStatus;

  // Legacy field kept for backward compatibility with old records.
  @Prop()
  adminApproved?: boolean;

  @Prop({ default: '' })
  category: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SelfieEntrySchema = SchemaFactory.createForClass(SelfieEntry);

SelfieEntrySchema.index({ userId: 1, dateKey: 1 }, { unique: true });
