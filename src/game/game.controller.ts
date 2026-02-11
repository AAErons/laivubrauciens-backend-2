import { Body, Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
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

  @Post('session')
  async session(
    @Body() body: { start?: boolean; reset?: boolean },
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.getUserId(authorization);
    if (body.reset || body.start) {
      const session = await this.gameService.startSession(userId, Boolean(body.reset));
      return this.gameService.toResponse(session);
    }
    const session = await this.gameService.getOrCreateSession(userId);
    return this.gameService.toResponse(session);
  }

  @Post('move')
  async move(
    @Body() body: { from?: number; to?: number },
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.getUserId(authorization);
    const session = await this.gameService.applyMove(userId, body.from ?? -1, body.to ?? -1);
    return this.gameService.toResponse(session);
  }

  @Post('bomb')
  async bomb(
    @Body() body: { index?: number },
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.getUserId(authorization);
    const session = await this.gameService.applyBomb(userId, body.index ?? -1);
    return this.gameService.toResponse(session);
  }

  @Post('crystal')
  async crystal(
    @Body() body: { index?: number },
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.getUserId(authorization);
    const session = await this.gameService.applyCrystal(userId, body.index ?? -1);
    return this.gameService.toResponse(session);
  }

  @Post('upgrade')
  async upgrade(
    @Body() body: { choice?: string },
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.getUserId(authorization);
    const session = await this.gameService.applyUpgrade(
      userId,
      (body.choice ?? '') as 'time' | 'multiplier' | 'refresh' | 'bomb',
    );
    return this.gameService.toResponse(session);
  }

  @Post('refresh')
  async refresh(@Headers('authorization') authorization?: string) {
    const userId = this.getUserId(authorization);
    const session = await this.gameService.refreshGrid(userId);
    return this.gameService.toResponse(session);
  }

  @Post('end')
  async end(@Headers('authorization') authorization?: string) {
    const userId = this.getUserId(authorization);
    return this.gameService.finalizeSession(userId);
  }
}
