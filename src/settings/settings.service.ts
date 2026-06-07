import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AppSettings, AppSettingsDocument } from './settings.schema';

export type AppSettingsResponse = {
  vardiGameEnabled: boolean;
};

const SETTINGS_KEY = 'global';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(AppSettings.name)
    private readonly settingsModel: Model<AppSettingsDocument>,
  ) {}

  async getSettings(): Promise<AppSettingsResponse> {
    const settings = await this.getOrCreate();
    return this.toResponse(settings);
  }

  async setVardiGameEnabled(enabled: boolean): Promise<AppSettingsResponse> {
    const settings = await this.settingsModel
      .findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $set: { key: SETTINGS_KEY, vardiGameEnabled: enabled } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
    return this.toResponse(settings);
  }

  private async getOrCreate(): Promise<AppSettingsDocument> {
    const existing = await this.settingsModel.findOne({ key: SETTINGS_KEY }).exec();
    if (existing) {
      return existing;
    }
    return this.settingsModel.create({ key: SETTINGS_KEY });
  }

  private toResponse(settings: AppSettingsDocument): AppSettingsResponse {
    return { vardiGameEnabled: Boolean(settings.vardiGameEnabled) };
  }
}
