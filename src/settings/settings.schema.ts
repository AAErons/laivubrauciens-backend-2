import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppSettingsDocument = HydratedDocument<AppSettings>;

/** Global, app-wide settings stored as a single singleton document. */
@Schema({ timestamps: true })
export class AppSettings {
  @Prop({ required: true, unique: true, default: 'global' })
  key: string;

  @Prop({ default: false })
  vardiGameEnabled: boolean;

  @Prop({ type: [String], default: [] })
  teamDividerPeople: string[];

  @Prop({ type: [[String]], default: [] })
  teamDividerSavedTeams: string[][];
}

export const AppSettingsSchema = SchemaFactory.createForClass(AppSettings);
