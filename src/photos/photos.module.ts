import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { Photo, PhotoSchema } from './photo.schema';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  imports: [ConfigModule, MongooseModule.forFeature([{ name: Photo.name, schema: PhotoSchema }])],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
