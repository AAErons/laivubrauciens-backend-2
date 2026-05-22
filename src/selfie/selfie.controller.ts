import { Body, Controller, Get, Headers, Post, Put, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import { SelfieService } from './selfie.service';

@Controller('selfie')
export class SelfieController {
  constructor(
    private readonly selfieService: SelfieService,
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

  @Get('me/today')
  async getMyToday(@Headers('authorization') authorization?: string) {
    const userId = this.getUserId(authorization);
    const entry = await this.selfieService.getTodayByUser(userId);
    if (!entry) {
      return { entry: null };
    }
    return {
      entry: {
        url: entry.url,
        dateKey: entry.dateKey,
        showToOthers: entry.showToOthers,
        adminApproved: entry.adminApproved,
        category: entry.category,
        createdAt: entry.createdAt,
      },
    };
  }

  @Get('me/stats')
  async getMyStats(@Headers('authorization') authorization?: string) {
    const userId = this.getUserId(authorization);
    const addedDays = await this.selfieService.getAddedDaysCount(userId);
    return { addedDays };
  }

  @Get('me')
  async listMine(@Headers('authorization') authorization?: string) {
    const userId = this.getUserId(authorization);
    const entries = await this.selfieService.listByUser(userId);
    return {
      entries: entries.map((entry) => ({
        url: entry.url,
        dateKey: entry.dateKey,
        showToOthers: entry.showToOthers,
        adminApproved: entry.adminApproved,
        category: entry.category,
        createdAt: entry.createdAt,
      })),
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      imageBase64?: string;
      showToOthers?: boolean;
      category?: string;
    },
    @Headers('authorization') authorization?: string,
  ) {
    if (!body.imageBase64) {
      return { entry: null, created: false };
    }
    const userId = this.getUserId(authorization);
    const result = await this.selfieService.createTodayEntry(userId, {
      imageBase64: body.imageBase64,
      showToOthers: body.showToOthers,
      category: body.category,
    });
    return {
      created: result.created,
      entry: {
        url: result.entry.url,
        dateKey: result.entry.dateKey,
        showToOthers: result.entry.showToOthers,
        adminApproved: result.entry.adminApproved,
        category: result.entry.category,
        createdAt: result.entry.createdAt,
      },
    };
  }

  @Put('me/today')
  async update(
    @Body()
    body: {
      imageBase64?: string;
      showToOthers?: boolean;
      category?: string;
    },
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.getUserId(authorization);
    const entry = await this.selfieService.updateTodayEntry(userId, {
      imageBase64: body.imageBase64,
      showToOthers: body.showToOthers,
      category: body.category,
    });
    if (!entry) {
      return { entry: null };
    }
    return {
      entry: {
        url: entry.url,
        dateKey: entry.dateKey,
        showToOthers: entry.showToOthers,
        adminApproved: entry.adminApproved,
        category: entry.category,
        createdAt: entry.createdAt,
      },
    };
  }

  @Get('public/today')
  async listPublicToday() {
    const entries = await this.selfieService.listPublicApprovedToday();
    return {
      entries: entries.map((entry) => ({
        url: entry.url,
        category: entry.category,
        createdAt: entry.createdAt,
      })),
    };
  }
}
