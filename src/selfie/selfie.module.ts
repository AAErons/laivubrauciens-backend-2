import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { SelfieController } from './selfie.controller';
import { SelfieEntry, SelfieEntrySchema } from './selfie-entry.schema';
import { SelfieService } from './selfie.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: SelfieEntry.name, schema: SelfieEntrySchema }]),
  ],
  controllers: [SelfieController],
  providers: [SelfieService],
})
export class SelfieModule {}
