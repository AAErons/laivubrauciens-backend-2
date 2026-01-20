import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { PhotosService } from './photos.service';

@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Get('summary')
  async summary() {
    const years = [2020, 2021, 2022, 2023, 2024, 2025];
    const summary = await this.photosService.getYearSummary(years);
    return { summary };
  }

  @Get()
  async listByYear(@Query('year') year?: string) {
    const parsed = Number(year);
    if (!parsed) {
      return { photos: [] };
    }
    const photos = await this.photosService.getByYear(parsed);
    return { photos };
  }

  @Post('upload')
  async upload(
    @Body()
    body: {
      userId?: string;
      year?: number;
      imageBase64?: string;
    },
  ) {
    if (!body.userId || !body.year || !body.imageBase64) {
      return { photo: null };
    }

    const photo = await this.photosService.uploadPhoto(body.userId, body.year, body.imageBase64);
    return { photo };
  }
}
