import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AppSettings, AppSettingsSchema } from './settings.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: AppSettings.name, schema: AppSettingsSchema }]),
    UsersModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
