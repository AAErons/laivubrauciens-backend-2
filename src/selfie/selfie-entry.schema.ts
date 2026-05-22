import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SelfieEntryDocument = HydratedDocument<SelfieEntry>;

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

  @Prop({ default: false })
  adminApproved: boolean;

  @Prop({ default: '' })
  category: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SelfieEntrySchema = SchemaFactory.createForClass(SelfieEntry);

SelfieEntrySchema.index({ userId: 1, dateKey: 1 }, { unique: true });
