import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PhotoDocument = HydratedDocument<Photo>;

@Schema({ timestamps: true })
export class Photo {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  userId: string;
}

export const PhotoSchema = SchemaFactory.createForClass(Photo);
