import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { MemesController } from './memes.controller';
import { MemesService } from './memes.service';
import { Meme, MemeSchema } from './meme.schema';

@Module({
  imports: [ConfigModule, MongooseModule.forFeature([{ name: Meme.name, schema: MemeSchema }])],
  controllers: [MemesController],
  providers: [MemesService],
})
export class MemesModule {}
