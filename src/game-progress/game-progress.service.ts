import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { GameProgress, GameProgressDocument } from './game-progress.schema';
import { UsersService } from '../users/users.service';

export type GameProgressResponse = {
  selectedLetters: string[];
  lettersLocked: boolean;
  completedNames: string[];
  currentInputs: Record<string, Record<string, string>>;
  nameOrder: number[];
  completedAt: string | null;
};

export type GameProgressResultRow = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  vardiCompletedAt: string | null;
};

/**
 * Number of names a player must guess to finish. Kept in sync with the names
 * list in the frontend (front/src/vardi-game/names.ts).
 */
const REQUIRED_NAME_COUNT = 47;

export type SaveGameProgressInput = {
  selectedLetters?: unknown;
  lettersLocked?: unknown;
  completedNames?: unknown;
  currentInputs?: unknown;
};

const MAX_SELECTED_LETTERS = 3;

@Injectable()
export class GameProgressService {
  constructor(
    @InjectModel(GameProgress.name)
    private readonly gameProgressModel: Model<GameProgressDocument>,
    private readonly usersService: UsersService,
  ) {}

  async getProgress(userId: string): Promise<GameProgressResponse> {
    let progress = await this.gameProgressModel.findOne({ userId }).exec();
    if (!progress) {
      // Create the document on first load so the random order is fixed once.
      progress = await this.gameProgressModel.create({
        userId,
        nameOrder: this.createNameOrder(),
      });
    } else if (!progress.nameOrder || progress.nameOrder.length !== REQUIRED_NAME_COUNT) {
      progress.nameOrder = this.createNameOrder();
      await progress.save();
    }
    return this.toResponse(progress);
  }

  /** Fisher-Yates shuffle of [0 .. REQUIRED_NAME_COUNT - 1]. */
  private createNameOrder(): number[] {
    const order = Array.from({ length: REQUIRED_NAME_COUNT }, (_, index) => index);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  async saveProgress(
    userId: string,
    input: SaveGameProgressInput,
  ): Promise<GameProgressResponse> {
    const selectedLetters = this.sanitizeSelectedLetters(input.selectedLetters);
    const lettersLocked = Boolean(input.lettersLocked) || selectedLetters.length > 0;
    const completedNames = this.sanitizeStringArray(input.completedNames);
    const inputs = this.toStoredInputs(input.currentInputs);

    const existing = await this.gameProgressModel.findOne({ userId }).exec();
    // The completion timestamp is stamped exactly once and never reset.
    let completedAt = existing?.completedAt ?? null;
    if (!completedAt && completedNames.length >= REQUIRED_NAME_COUNT) {
      completedAt = new Date();
    }

    const progress = await this.gameProgressModel
      .findOneAndUpdate(
        { userId },
        {
          $set: {
            userId,
            selectedLetters,
            lettersLocked,
            completedNames,
            inputs,
            completedAt,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return this.toResponse(progress);
  }

  async getResults(): Promise<GameProgressResultRow[]> {
    const finished = await this.gameProgressModel
      .find({ completedAt: { $ne: null } })
      .sort({ completedAt: 1 })
      .exec();
    if (!finished.length) {
      return [];
    }
    const users = await this.usersService.getBasicUsersByIds(
      finished.map((entry) => entry.userId),
    );
    const usersMap = new Map(users.map((user) => [user.id, user]));
    return finished.map((entry) => {
      const user = usersMap.get(entry.userId);
      return {
        id: entry.userId,
        name: user?.name,
        firstName: user?.firstName,
        lastName: user?.lastName,
        vardiCompletedAt: entry.completedAt ? entry.completedAt.toISOString() : null,
      };
    });
  }

  private toResponse(progress: GameProgressDocument): GameProgressResponse {
    const currentInputs: Record<string, Record<string, string>> = {};
    for (const entry of progress.inputs ?? []) {
      const values: Record<string, string> = {};
      for (const value of entry.values ?? []) {
        values[String(value.index)] = value.value;
      }
      currentInputs[entry.name] = values;
    }
    return {
      selectedLetters: progress.selectedLetters ?? [],
      lettersLocked: Boolean(progress.lettersLocked),
      completedNames: progress.completedNames ?? [],
      currentInputs,
      nameOrder: progress.nameOrder ?? [],
      completedAt: progress.completedAt ? progress.completedAt.toISOString() : null,
    };
  }

  private toStoredInputs(raw: unknown) {
    if (!raw || typeof raw !== 'object') {
      return [];
    }
    const result: { name: string; values: { index: number; value: string }[] }[] = [];
    for (const [name, positions] of Object.entries(raw as Record<string, unknown>)) {
      if (!positions || typeof positions !== 'object') {
        continue;
      }
      const values: { index: number; value: string }[] = [];
      for (const [index, value] of Object.entries(positions as Record<string, unknown>)) {
        const parsedIndex = Number.parseInt(index, 10);
        if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
          continue;
        }
        if (typeof value !== 'string') {
          continue;
        }
        values.push({ index: parsedIndex, value: value.slice(0, 4) });
      }
      result.push({ name, values });
    }
    return result;
  }

  private sanitizeSelectedLetters(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    const letters = raw
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0);
    return Array.from(new Set(letters)).slice(0, MAX_SELECTED_LETTERS);
  }

  private sanitizeStringArray(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return Array.from(
      new Set(
        raw
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );
  }
}
