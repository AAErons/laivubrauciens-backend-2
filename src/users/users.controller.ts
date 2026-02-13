import { Body, Controller, Get, Header, Post, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('profile')
  async updateProfile(
    @Body()
    body: {
      userId?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      about?: string;
      favoriteColor?: string;
      nickname?: string;
      favoriteFood?: string;
      participationYears?: number[];
      pastExperience?: string;
      showProfile?: boolean;
      picture?: string;
      gameEmojiTheme?: string;
    },
  ) {
    const userId = body.userId;
    if (!userId) {
      return { user: null };
    }

    const name = body.name?.trim();
    const user = await this.usersService.updateProfile(userId, {
      name,
      firstName: body.firstName,
      lastName: body.lastName,
      about: body.about,
      favoriteColor: body.favoriteColor,
      nickname: body.nickname,
      favoriteFood: body.favoriteFood,
      participationYears: body.participationYears,
      pastExperience: body.pastExperience,
      showProfile: body.showProfile,
      picture: body.picture,
      gameEmojiTheme: body.gameEmojiTheme,
    });

    if (!user) {
      return { user: null };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        about: user.about,
        favoriteColor: user.favoriteColor,
        nickname: user.nickname,
        favoriteFood: user.favoriteFood,
        participationYears: user.participationYears,
        pastExperience: user.pastExperience,
        showProfile: user.showProfile,
        picture: user.picture,
        gameEmojiTheme: user.gameEmojiTheme,
        firstTaskCompletedAt: user.firstTaskCompletedAt,
      },
    };
  }

  @Post('profile-picture')
  async uploadProfilePicture(
    @Body() body: { userId?: string; email?: string; imageBase64?: string },
  ) {
    if (!body.imageBase64) {
      return { url: null, user: null };
    }

    let userId = body.userId;
    if (!userId && body.email) {
      const userByEmail = await this.usersService.findByEmail(body.email);
      userId = userByEmail?.id;
    }

    if (!userId) {
      return { url: null, user: null };
    }

    const url = await this.usersService.uploadProfilePicture(body.imageBase64);
    const user = await this.usersService.updateProfile(userId, { picture: url });

    if (!user) {
      return { url, user: null };
    }

    return {
      url,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        about: user.about,
        favoriteColor: user.favoriteColor,
        nickname: user.nickname,
        favoriteFood: user.favoriteFood,
        participationYears: user.participationYears,
        showProfile: user.showProfile,
        picture: user.picture,
        gameEmojiTheme: user.gameEmojiTheme,
        firstTaskCompletedAt: user.firstTaskCompletedAt,
      },
    };
  }

  @Get('first-task')
  async getFirstTaskStatus(@Query('userId') userId?: string) {
    if (!userId) {
      return { completed: false, firstTaskCompletedAt: null };
    }
    const user = await this.usersService.getFirstTaskStatus(userId);
    return {
      completed: Boolean(user?.firstTaskCompletedAt),
      firstTaskCompletedAt: user?.firstTaskCompletedAt ?? null,
    };
  }

  @Post('first-task')
  async lockFirstTask(@Body() body: { userId?: string }) {
    const userId = body.userId;
    if (!userId) {
      return { completed: false, firstTaskCompletedAt: null };
    }
    const user = await this.usersService.lockFirstTask(userId);
    return {
      completed: Boolean(user?.firstTaskCompletedAt),
      firstTaskCompletedAt: user?.firstTaskCompletedAt ?? null,
    };
  }

  @Get('public')
  async listPublicProfiles() {
    const users = await this.usersService.findVisibleParticipants();
    return {
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        favoriteFood: user.favoriteFood,
        pastExperience: user.pastExperience,
        about: user.about,
        favoriteColor: user.favoriteColor,
        participationYears: user.participationYears,
        picture: user.picture,
      })),
    };
  }

  @Get('first-task-results')
  @Header('Cache-Control', 'no-store')
  async listFirstTaskResults() {
    const users = await this.usersService.getFirstTaskResults();
    return {
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        picture: user.picture,
        firstTaskCompletedAt: user.firstTaskCompletedAt,
      })),
    };
  }

  @Get('highscore-results')
  @Header('Cache-Control', 'no-store')
  async listHighScoreResults() {
    const users = await this.usersService.getHighScoreResults();
    return {
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        highScore: user.highScore ?? 0,
      })),
    };
  }

  @Post('highscore')
  async submitHighScore(
    @Body() body: { score?: number },
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }
    const secret = this.configService.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret missing');
    }
    let payload: { sub?: string };
    try {
      payload = jwt.verify(token, secret) as { sub?: string };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    const score = body.score ?? 0;
    const result = await this.usersService.submitHighScore(userId, score);
    if (!result) {
      return { highScore: null, updated: false };
    }
    return result;
  }
}
