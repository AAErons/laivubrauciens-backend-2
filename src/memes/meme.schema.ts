import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MemeDocument = HydratedDocument<Meme>;

@Schema({ timestamps: true })
export class Meme {
  @Prop({ required: true })
  url: string;

  @Prop({ default: '' })
  topText: string;

  @Prop({ default: '' })
  bottomText: string;

  @Prop({ default: 28 })
  topSize: number;

  @Prop({ default: 28 })
  bottomSize: number;

  @Prop({ required: true, unique: true })
  userId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MemeSchema = SchemaFactory.createForClass(Meme);
