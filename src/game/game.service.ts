import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { GameSession, GameDocument } from './game.schema';
import { UsersService } from '../users/users.service';

const GAME_SIZE = 5;
const EMOJI_THEMES: Record<string, string[]> = {
  laivu: ['⛵', '☀️', '🏖️', '🍺', '😊'],
  auglisi: ['🍎', '🍊', '🍋', '🍇', '🍉'],
};
const UPGRADE_THRESHOLDS = [250, 750, 2000];
const UPGRADE_POOL = ['time', 'multiplier', 'refresh', 'bomb', 'crystal'] as const;
const UPGRADE_TIERS = [
  { time: 10, multiplier: 2, bomb: 0.05, crystal: 0.02, refreshDelta: -3, refreshNoCooldown: false },
  { time: 30, multiplier: 3, bomb: 0.15, crystal: 0.05, refreshDelta: -6, refreshNoCooldown: false },
  { time: 60, multiplier: 4, bomb: 0.35, crystal: 0.2, refreshDelta: 0, refreshNoCooldown: true },
] as const;
type UpgradeChoice = (typeof UPGRADE_POOL)[number];

type MatchResult = { matches: Set<number>; runs: number[] };

@Injectable()
export class GameService {
  constructor(
    @InjectModel(GameSession.name) private readonly gameModel: Model<GameDocument>,
    private readonly usersService: UsersService,
  ) {}

  async getOrCreateSession(userId: string) {
    const theme = await this.usersService.getGameEmojiTheme(userId);
    let session = await this.gameModel.findOne({ userId }).exec();
    if (!session) {
      session = new this.gameModel({
        userId,
        emojiTheme: theme,
        grid: this.createInitialGrid(this.getEmojiSet(theme)),
        score: 0,
        durationSeconds: 60,
        status: 'ready',
        bombs: 1,
        crystals: 1,
        bombDropChance: 0.02,
        crystalDropChance: 0.01,
        scoreMultiplier: 1,
        refreshBase: 10,
        upgradeIndex: 0,
        upgradeTier: -1,
        upgradePending: false,
        upgradeChoices: [],
      });
      await session.save();
    } else if (session.status !== 'active' && session.emojiTheme !== theme) {
      session.emojiTheme = theme;
      await session.save();
    }
    return session;
  }

  async startSession(userId: string, reset = false) {
    const session = await this.getOrCreateSession(userId);
    const theme = await this.usersService.getGameEmojiTheme(userId);
    if (reset || session.status === 'ended') {
      session.emojiTheme = theme;
      session.grid = this.createInitialGrid(this.getEmojiSet(theme));
      session.score = 0;
      session.bombs = 1;
      session.crystals = 1;
      session.bombDropChance = 0.02;
      session.crystalDropChance = 0.01;
      session.scoreMultiplier = 1;
      session.refreshBase = 10;
      session.upgradeIndex = 0;
      session.upgradeTier = -1;
      session.upgradePending = false;
      session.upgradeChoices = [];
    }
    session.durationSeconds = 60;
    session.startedAt = new Date();
    session.status = 'active';
    await session.save();
    return session;
  }

  async applyMove(userId: string, from: number, to: number) {
  const session = await this.getOrCreateSession(userId);
    if (!this.ensurePlayable(session)) {
      return session;
    }
    if (!this.isIndexValid(from) || !this.isIndexValid(to)) {
      return session;
    }
    if (from === to) {
      return session;
    }
    this.swap(session.grid, from, to);
    if (this.getMatchRuns(session.grid).matches.size === 0) {
      this.swap(session.grid, from, to);
      await session.save();
      return session;
    }
    this.resolveMatches(session);
    if (!this.hasPossibleMoves(session.grid)) {
      session.grid = this.createInitialGrid(this.getEmojiSet(session.emojiTheme));
    }
    await session.save();
    return session;
  }

  async applyBomb(userId: string, index: number) {
    const session = await this.getOrCreateSession(userId);
    if (!this.ensurePlayable(session)) {
      return session;
    }
    if (!this.isIndexValid(index) || session.bombs <= 0) {
      return session;
    }
    session.bombs = Math.max(0, session.bombs - 1);
    const indices = this.getBombIndices(index);
    indices.forEach((idx) => {
      session.grid[idx] = '';
    });
    const points = Math.round(50 * session.scoreMultiplier);
    this.applyScore(session, points);
    this.collapseGrid(session.grid, this.getEmojiSet(session.emojiTheme));
    this.resolveMatches(session);
    if (!this.hasPossibleMoves(session.grid)) {
      session.grid = this.createInitialGrid(this.getEmojiSet(session.emojiTheme));
    }
    await session.save();
    return session;
  }

  async applyCrystal(userId: string, index: number) {
    const session = await this.getOrCreateSession(userId);
    if (!this.ensurePlayable(session)) {
      return session;
    }
    if (!this.isIndexValid(index) || session.crystals <= 0) {
      return session;
    }
    const target = session.grid[index];
    if (!target) {
      return session;
    }
    session.crystals = Math.max(0, session.crystals - 1);
    const indices = session.grid
      .map((value, idx) => (value === target ? idx : -1))
      .filter((idx) => idx >= 0);
    indices.forEach((idx) => {
      session.grid[idx] = '';
    });
    const points = Math.round(indices.length * 10 * session.scoreMultiplier);
    this.applyScore(session, points);
    this.collapseGrid(session.grid, this.getEmojiSet(session.emojiTheme));
    this.resolveMatches(session);
    if (!this.hasPossibleMoves(session.grid)) {
      session.grid = this.createInitialGrid(this.getEmojiSet(session.emojiTheme));
    }
    await session.save();
    return session;
  }

  async applyUpgrade(userId: string, choice: UpgradeChoice) {
    const session = await this.getOrCreateSession(userId);
    if (!session.upgradePending) {
      return session;
    }
    if (!session.upgradeChoices.includes(choice)) {
      return session;
    }
    const tier = UPGRADE_TIERS[session.upgradeTier] ?? UPGRADE_TIERS[0];
    if (choice === 'time') {
      session.durationSeconds = Math.max(0, session.durationSeconds + tier.time);
    } else if (choice === 'multiplier') {
      session.scoreMultiplier = tier.multiplier;
    } else if (choice === 'refresh') {
      if (tier.refreshNoCooldown) {
        session.refreshBase = 0;
      } else {
        session.refreshBase = Math.max(0, session.refreshBase + tier.refreshDelta);
      }
    } else if (choice === 'bomb') {
      session.bombDropChance = Math.min(1, session.bombDropChance + tier.bomb);
    } else if (choice === 'crystal') {
      session.crystalDropChance = Math.min(1, session.crystalDropChance + tier.crystal);
    }
    session.upgradePending = false;
    session.upgradeChoices = [];
    session.upgradeTier = -1;
    session.startedAt = new Date();
    session.status = 'active';
    await session.save();
    return session;
  }

  async refreshGrid(userId: string) {
    const session = await this.getOrCreateSession(userId);
    const theme = await this.usersService.getGameEmojiTheme(userId);
    session.emojiTheme = theme;
    this.ensurePlayable(session);
    session.grid = this.createInitialGrid(this.getEmojiSet(theme));
    await session.save();
    return session;
  }

  async finalizeSession(userId: string) {
    const session = await this.getOrCreateSession(userId);
    session.status = 'ended';
    session.startedAt = null;
    await session.save();
    const result = await this.usersService.submitHighScore(userId, session.score);
    return {
      score: session.score,
      highScore: result?.highScore ?? null,
      updated: result?.updated ?? false,
    };
  }

  getTimeLeft(session: GameDocument) {
    if (!session.startedAt || session.status === 'ready') {
      return session.durationSeconds;
    }
    const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    const remaining = Math.max(0, session.durationSeconds - elapsed);
    if (remaining <= 0 && session.status !== 'ended') {
      session.status = 'ended';
    }
    return remaining;
  }

  toResponse(session: GameDocument) {
    const timeLeft = this.getTimeLeft(session);
    return {
      grid: session.grid,
      score: session.score,
      timeLeft,
      status: session.status,
      bombs: session.bombs,
      crystals: session.crystals,
      bombDropChance: session.bombDropChance,
      crystalDropChance: session.crystalDropChance,
      scoreMultiplier: session.scoreMultiplier,
      refreshBase: session.refreshBase,
      upgradePending: session.upgradePending,
      upgradeTier: session.upgradeTier,
      upgradeChoices: session.upgradeChoices,
      hasMoves: this.hasPossibleMoves(session.grid),
    };
  }

  private ensurePlayable(session: GameDocument) {
    const timeLeft = this.getTimeLeft(session);
    if (session.status === 'ended' || timeLeft <= 0) {
      session.status = 'ended';
      return false;
    }
    if (session.upgradePending) {
      return false;
    }
    if (session.status !== 'active') {
      session.status = 'active';
      session.startedAt = new Date();
    }
    return true;
  }

  private applyScore(session: GameDocument, points: number) {
    if (points <= 0) {
      return;
    }
    const nextScore = session.score + points;
    const nextThreshold = UPGRADE_THRESHOLDS[session.upgradeIndex];
    if (
      nextThreshold !== undefined &&
      nextScore >= nextThreshold &&
      session.score < nextThreshold &&
      !session.upgradePending
    ) {
      session.upgradePending = true;
      session.upgradeChoices = this.pickUpgradeChoices();
      session.status = 'upgrade';
      session.startedAt = null;
      session.upgradeTier = session.upgradeIndex;
      session.upgradeIndex = Math.min(session.upgradeIndex + 1, UPGRADE_THRESHOLDS.length);
    }
    session.score = nextScore;
  }

  private resolveMatches(session: GameDocument) {
    let { matches, runs } = this.getMatchRuns(session.grid);
    while (matches.size > 0) {
      this.applyRunScore(session, runs);
      if (Math.random() < session.bombDropChance) {
        session.bombs += 1;
      }
      if (Math.random() < session.crystalDropChance) {
        session.crystals += 1;
      }
      matches.forEach((index) => {
        session.grid[index] = '';
      });
      this.collapseGrid(session.grid, this.getEmojiSet(session.emojiTheme));
      ({ matches, runs } = this.getMatchRuns(session.grid));
    }
  }

  private applyRunScore(session: GameDocument, runs: number[]) {
    let points = 0;
    runs.forEach((length) => {
      if (length >= 5) {
        points += 50;
      } else if (length === 4) {
        points += 20;
      } else if (length === 3) {
        points += 10;
      }
    });
    if (points > 0) {
      points = Math.round(points * session.scoreMultiplier);
      this.applyScore(session, points);
    }
  }

  private getMatchRuns(grid: string[]): MatchResult {
    const matches = new Set<number>();
    const runs: number[] = [];
    for (let row = 0; row < GAME_SIZE; row += 1) {
      let runStart = 0;
      for (let col = 1; col <= GAME_SIZE; col += 1) {
        const current = col < GAME_SIZE ? grid[row * GAME_SIZE + col] : '';
        const previous = grid[row * GAME_SIZE + col - 1];
        if (col < GAME_SIZE && current === previous && current !== '') {
          continue;
        }
        const runLength = col - runStart;
        if (runLength >= 3 && previous !== '') {
          runs.push(runLength);
          for (let c = runStart; c < col; c += 1) {
            matches.add(row * GAME_SIZE + c);
          }
        }
        runStart = col;
      }
    }
    for (let col = 0; col < GAME_SIZE; col += 1) {
      let runStart = 0;
      for (let row = 1; row <= GAME_SIZE; row += 1) {
        const current = row < GAME_SIZE ? grid[row * GAME_SIZE + col] : '';
        const previous = grid[(row - 1) * GAME_SIZE + col];
        if (row < GAME_SIZE && current === previous && current !== '') {
          continue;
        }
        const runLength = row - runStart;
        if (runLength >= 3 && previous !== '') {
          runs.push(runLength);
          for (let r = runStart; r < row; r += 1) {
            matches.add(r * GAME_SIZE + col);
          }
        }
        runStart = row;
      }
    }
    return { matches, runs };
  }

  private collapseGrid(grid: string[], emojis: string[]) {
    for (let col = 0; col < GAME_SIZE; col += 1) {
      const stack: string[] = [];
      for (let row = GAME_SIZE - 1; row >= 0; row -= 1) {
        const value = grid[row * GAME_SIZE + col];
        if (value !== '') {
          stack.push(value);
        }
      }
      for (let row = GAME_SIZE - 1; row >= 0; row -= 1) {
        grid[row * GAME_SIZE + col] = stack.shift() ?? '';
      }
      for (let row = 0; row < GAME_SIZE; row += 1) {
        if (grid[row * GAME_SIZE + col] === '') {
          grid[row * GAME_SIZE + col] = this.randomEmoji(emojis);
        }
      }
    }
  }

  private createInitialGrid(emojis: string[]) {
    let grid = Array.from({ length: GAME_SIZE * GAME_SIZE }, () => this.randomEmoji(emojis));
    while (this.getMatchRuns(grid).matches.size > 0) {
      grid = Array.from({ length: GAME_SIZE * GAME_SIZE }, () => this.randomEmoji(emojis));
    }
    return grid;
  }

  private getBombIndices(index: number) {
    const row = Math.floor(index / GAME_SIZE);
    const col = index % GAME_SIZE;
    const indices = new Set<number>([index]);
    const neighbors = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];
    neighbors.forEach(([r, c]) => {
      if (r >= 0 && r < GAME_SIZE && c >= 0 && c < GAME_SIZE) {
        indices.add(r * GAME_SIZE + c);
      }
    });
    return indices;
  }

  private pickUpgradeChoices(): UpgradeChoice[] {
    const shuffled = [...UPGRADE_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  private randomEmoji(emojis: string[]) {
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  private hasPossibleMoves(grid: string[]) {
    for (let row = 0; row < GAME_SIZE; row += 1) {
      for (let col = 0; col < GAME_SIZE; col += 1) {
        const index = row * GAME_SIZE + col;
        const right = col + 1 < GAME_SIZE ? index + 1 : -1;
        const down = row + 1 < GAME_SIZE ? index + GAME_SIZE : -1;
        if (right >= 0) {
          this.swap(grid, index, right);
          const hasMatch = this.getMatchRuns(grid).matches.size > 0;
          this.swap(grid, index, right);
          if (hasMatch) {
            return true;
          }
        }
        if (down >= 0) {
          this.swap(grid, index, down);
          const hasMatch = this.getMatchRuns(grid).matches.size > 0;
          this.swap(grid, index, down);
          if (hasMatch) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getEmojiSet(theme?: string) {
    return EMOJI_THEMES[theme ?? 'laivu'] ?? EMOJI_THEMES.laivu;
  }

  private isIndexValid(index: number) {
    return Number.isInteger(index) && index >= 0 && index < GAME_SIZE * GAME_SIZE;
  }

  private swap(grid: string[], a: number, b: number) {
    const temp = grid[a];
    grid[a] = grid[b];
    grid[b] = temp;
  }
}
