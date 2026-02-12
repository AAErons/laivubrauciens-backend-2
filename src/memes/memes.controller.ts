import { Body, Controller, Delete, Get, Headers, Post, Put, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import { MemesService } from './memes.service';

@Controller('memes')
export class MemesController {
  constructor(
    private readonly memesService: MemesService,
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
  async list() {
    const memes = await this.memesService.listMemes();
    return {
      memes: memes.map((meme) => ({
        url: meme.url,
        topText: meme.topText,
        bottomText: meme.bottomText,
        topSize: meme.topSize,
        bottomSize: meme.bottomSize,
        createdAt: meme.createdAt,
      })),
    };
  }

  @Get('me')
  async getMine(@Headers('authorization') authorization?: string) {
    const userId = this.getUserId(authorization);
    const meme = await this.memesService.getByUser(userId);
    if (!meme) {
      return { meme: null };
    }
    return {
      meme: {
        url: meme.url,
        topText: meme.topText,
        bottomText: meme.bottomText,
        topSize: meme.topSize,
        bottomSize: meme.bottomSize,
        createdAt: meme.createdAt,
      },
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      imageBase64?: string;
      topText?: string;
      bottomText?: string;
      topSize?: number;
      bottomSize?: number;
    },
    @Headers('authorization') authorization?: string,
  ) {
    if (!body.imageBase64) {
      return { meme: null };
    }
    const userId = this.getUserId(authorization);
    const meme = await this.memesService.createMeme(userId, {
      imageBase64: body.imageBase64,
      topText: body.topText ?? '',
      bottomText: body.bottomText ?? '',
      topSize: body.topSize,
      bottomSize: body.bottomSize,
    });
    return {
      meme: {
        url: meme.url,
        topText: meme.topText,
        bottomText: meme.bottomText,
        topSize: meme.topSize,
        bottomSize: meme.bottomSize,
        createdAt: meme.createdAt,
      },
    };
  }

  @Put('me')
  async update(
    @Body()
    body: {
      imageBase64?: string;
      topText?: string;
      bottomText?: string;
      topSize?: number;
      bottomSize?: number;
    },
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.getUserId(authorization);
    const meme = await this.memesService.updateMeme(userId, {
      imageBase64: body.imageBase64,
      topText: body.topText,
      bottomText: body.bottomText,
      topSize: body.topSize,
      bottomSize: body.bottomSize,
    });
    if (!meme) {
      return { meme: null };
    }
    return {
      meme: {
        url: meme.url,
        topText: meme.topText,
        bottomText: meme.bottomText,
        topSize: meme.topSize,
        bottomSize: meme.bottomSize,
        createdAt: meme.createdAt,
      },
    };
  }

  @Delete('me')
  async remove(@Headers('authorization') authorization?: string) {
    const userId = this.getUserId(authorization);
    const deleted = await this.memesService.deleteMeme(userId);
    return { deleted };
  }
}
