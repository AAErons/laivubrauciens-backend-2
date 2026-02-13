import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GameDocument = HydratedDocument<GameSession>;

@Schema({ timestamps: true })
export class GameSession {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ type: [String], default: [] })
  grid: string[];

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 'laivu' })
  emojiTheme: string;

  @Prop({ type: Date, default: null })
  startedAt?: Date | null;

  @Prop({ default: 60 })
  durationSeconds: number;

  @Prop({ default: 'ready' })
  status: 'ready' | 'active' | 'ended' | 'upgrade';

  @Prop({ default: 0 })
  bombs: number;

  @Prop({ default: 0 })
  crystals: number;

  @Prop({ default: 0.02 })
  bombDropChance: number;

  @Prop({ default: 0.01 })
  crystalDropChance: number;

  @Prop({ default: 1 })
  scoreMultiplier: number;

  @Prop({ default: 10 })
  refreshBase: number;

  @Prop({ default: 0 })
  upgradeIndex: number;

  @Prop({ default: -1 })
  upgradeTier: number;

  @Prop({ default: false })
  upgradePending: boolean;

  @Prop({ type: [String], default: [] })
  upgradeChoices: string[];
}

export const GameSchema = SchemaFactory.createForClass(GameSession);
