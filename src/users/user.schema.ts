import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ default: 'google' })
  authProvider: 'google' | 'password';

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  name: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  about?: string;

  @Prop()
  favoriteColor?: string;

  @Prop()
  nickname?: string;

  @Prop()
  favoriteFood?: string;

  @Prop({ type: [Number], default: [] })
  participationYears?: number[];

  @Prop()
  pastExperience?: string;

  @Prop({ default: false })
  showProfile: boolean;

  @Prop()
  picture?: string;

  @Prop()
  passwordHash?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
