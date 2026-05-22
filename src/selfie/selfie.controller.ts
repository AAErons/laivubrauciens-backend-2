import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import { SelfieService } from './selfie.service';
import { UsersService } from '../users/users.service';

@Controller('selfie')
export class SelfieController {
  constructor(
    private readonly selfieService: SelfieService,
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
        moderationStatus: this.selfieService.getModerationStatus(entry),
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
        moderationStatus: this.selfieService.getModerationStatus(result.entry),
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
        moderationStatus: this.selfieService.getModerationStatus(entry),
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
        id: String((entry as unknown as { _id?: unknown })._id ?? ''),
        url: entry.url,
        category: entry.category,
        createdAt: entry.createdAt,
      })),
    };
  }

  @Get('public')
  async listPublic() {
    const entries = await this.selfieService.listPublicApproved();
    return {
      entries: entries.map((entry) => ({
        id: String((entry as unknown as { _id?: unknown })._id ?? ''),
        url: entry.url,
        category: entry.category,
        createdAt: entry.createdAt,
      })),
    };
  }

  @Get('admin/today')
  async listAdminToday(@Headers('authorization') authorization?: string) {
    await this.assertAdmin(authorization);
    const entries = await this.selfieService.listTodayAll();
    const userIds = Array.from(new Set(entries.map((entry) => entry.userId)));
    const users = await this.usersService.getBasicUsersByIds(userIds);
    const usersMap = new Map(
      users.map((user) => [
        user.id,
        {
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
        },
      ]),
    );
    return {
      entries: entries.map((entry) => ({
        id: String((entry as unknown as { _id?: unknown })._id ?? ''),
        userId: entry.userId,
        firstName: usersMap.get(entry.userId)?.firstName,
        lastName: usersMap.get(entry.userId)?.lastName,
        name: usersMap.get(entry.userId)?.name,
        url: entry.url,
        dateKey: entry.dateKey,
        showToOthers: entry.showToOthers,
        moderationStatus: this.selfieService.getModerationStatus(entry),
        category: entry.category,
        createdAt: entry.createdAt,
      })),
    };
  }

  @Put('admin/:entryId')
  async setAdminDecision(
    @Param('entryId') entryId: string,
    @Body() body: { approved?: boolean },
    @Headers('authorization') authorization?: string,
  ) {
    await this.assertAdmin(authorization);
    const entry = await this.selfieService.setAdminApproval(entryId, Boolean(body.approved));
    if (!entry) {
      return { entry: null };
    }
    return {
      entry: {
        id: String((entry as unknown as { _id?: unknown })._id ?? ''),
        userId: entry.userId,
        url: entry.url,
        dateKey: entry.dateKey,
        showToOthers: entry.showToOthers,
        moderationStatus: this.selfieService.getModerationStatus(entry),
        category: entry.category,
        createdAt: entry.createdAt,
      },
    };
  }
}
