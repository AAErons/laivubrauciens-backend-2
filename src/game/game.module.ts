import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameSession, GameSchema } from './game.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: GameSession.name, schema: GameSchema }]),
    UsersModule,
  ],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
