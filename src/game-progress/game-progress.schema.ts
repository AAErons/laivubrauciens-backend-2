import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GameProgressDocument = HydratedDocument<GameProgress>;

/**
 * A single typed-in letter for a name, stored as an array entry instead of an
 * object key because participant names may contain characters that are invalid
 * as MongoDB field names (e.g. the dot/space in "Laura F.").
 */
@Schema({ _id: false })
export class GameProgressInput {
  @Prop({ required: true })
  index: number;

  @Prop({ required: true })
  value: string;
}

export const GameProgressInputSchema = SchemaFactory.createForClass(GameProgressInput);

@Schema({ _id: false })
export class GameProgressName {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [GameProgressInputSchema], default: [] })
  values: GameProgressInput[];
}

export const GameProgressNameSchema = SchemaFactory.createForClass(GameProgressName);

@Schema({ timestamps: true })
export class GameProgress {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ type: [String], default: [] })
  selectedLetters: string[];

  @Prop({ default: false })
  lettersLocked: boolean;

  @Prop({ type: [String], default: [] })
  completedNames: string[];

  @Prop({ type: [GameProgressNameSchema], default: [] })
  inputs: GameProgressName[];

  /**
   * Per-user random display order: a one-time permutation of the name indices,
   * generated on first load and kept stable across sessions.
   */
  @Prop({ type: [Number], default: [] })
  nameOrder: number[];

  /** Set once, when every name has been guessed. Drives the 4th-task ranking. */
  @Prop({ type: Date, default: null })
  completedAt?: Date | null;
}

export const GameProgressSchema = SchemaFactory.createForClass(GameProgress);
