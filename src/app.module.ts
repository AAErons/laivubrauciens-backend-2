import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from './auth/auth.module';
import { PhotosModule } from './photos/photos.module';
import { UsersModule } from './users/users.module';
import { GameModule } from './game/game.module';
import { GameProgressModule } from './game-progress/game-progress.module';
import { SettingsModule } from './settings/settings.module';
import { SelfieModule } from './selfie/selfie.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    PhotosModule,
    UsersModule,
    GameModule,
    GameProgressModule,
    SettingsModule,
    SelfieModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
