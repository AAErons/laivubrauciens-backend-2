import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import { SettingsService } from './settings.service';
import type { AppSettingsUpdate } from './settings.service';
import { UsersService } from '../users/users.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
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

  private async assertAdmin(authorization?: string) {
    const userId = this.getUserId(authorization);
    const isAdmin = await this.usersService.isAdmin(userId);
    if (!isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }
    return userId;
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Post()
  async updateSettings(
    @Body() body: AppSettingsUpdate,
    @Headers('authorization') authorization?: string,
  ) {
    await this.assertAdmin(authorization);
    return this.settingsService.updateSettings(body);
  }
}
