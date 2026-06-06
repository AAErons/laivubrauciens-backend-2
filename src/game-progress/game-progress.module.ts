import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { GameProgressController } from './game-progress.controller';
import { GameProgressService } from './game-progress.service';
import { GameProgress, GameProgressSchema } from './game-progress.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: GameProgress.name, schema: GameProgressSchema }]),
    UsersModule,
  ],
  controllers: [GameProgressController],
  providers: [GameProgressService],
})
export class GameProgressModule {}
