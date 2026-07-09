import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import { GameProgressService } from './game-progress.service';
import type { SaveGameProgressInput } from './game-progress.service';

@Controller('game-progress')
export class GameProgressController {
  constructor(
    private readonly gameProgressService: GameProgressService,
    private readonly configService: ConfigService,
  ) {}

  private getUserId(authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }
    const secret = this.configService.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret missing');
    }
    try {
      const payload = jwt.verify(token, secret) as { sub?: string };
      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Get()
  async getProgress(@Headers('authorization') authorization?: string) {
    const userId = this.getUserId(authorization);
    return this.gameProgressService.getProgress(userId);
  }

  @Post()
  async saveProgress(
    @Body() body: SaveGameProgressInput,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.getUserId(authorization);
    return this.gameProgressService.saveProgress(userId, body ?? {});
  }
}
