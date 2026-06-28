import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AppSettings, AppSettingsDocument } from './settings.schema';

export type AppSettingsResponse = {
  vardiGameEnabled: boolean;
  teamDividerPeople: string[];
  teamDividerSavedTeams: string[][];
  teamDividerScores: Record<string, number>;
};

export type AppSettingsUpdate = {
  vardiGameEnabled?: boolean;
  teamDividerPeople?: string[];
  teamDividerSavedTeams?: string[][];
  teamDividerScores?: Record<string, number>;
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
    return this.updateSettings({ vardiGameEnabled: enabled });
  }

  async updateSettings(update: AppSettingsUpdate): Promise<AppSettingsResponse> {
    const $set: Partial<AppSettings> & { key: string } = { key: SETTINGS_KEY };
    if (typeof update.vardiGameEnabled === 'boolean') {
      $set.vardiGameEnabled = update.vardiGameEnabled;
    }
    if (Array.isArray(update.teamDividerPeople)) {
      $set.teamDividerPeople = this.normalizePeople(update.teamDividerPeople);
    }
    if (Array.isArray(update.teamDividerSavedTeams)) {
      $set.teamDividerSavedTeams = this.normalizeTeams(update.teamDividerSavedTeams);
    }
    if (update.teamDividerScores && typeof update.teamDividerScores === 'object') {
      $set.teamDividerScores = this.normalizeScores(update.teamDividerScores);
    }

    const settings = await this.settingsModel
      .findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $set },
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
    return {
      vardiGameEnabled: Boolean(settings.vardiGameEnabled),
      teamDividerPeople: this.normalizePeople(settings.teamDividerPeople ?? []),
      teamDividerSavedTeams: this.normalizeTeams(settings.teamDividerSavedTeams ?? []),
      teamDividerScores: this.normalizeScores(settings.teamDividerScores ?? {}),
    };
  }

  private normalizePeople(people: string[]) {
    const seen = new Set<string>();
    return people
      .map((name) => String(name).trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLocaleLowerCase('lv-LV');
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  private normalizeTeams(teams: string[][]) {
    return teams
      .filter(Array.isArray)
      .map((team) => this.normalizePeople(team))
      .filter((team) => team.length > 0);
  }

  private normalizeScores(scores: Record<string, number>) {
    return Object.entries(scores).reduce<Record<string, number>>((normalized, [name, score]) => {
      const normalizedName = String(name).trim();
      const normalizedScore = Number(score);
      if (!normalizedName || !Number.isFinite(normalizedScore)) {
        return normalized;
      }
      normalized[normalizedName] = Math.trunc(normalizedScore);
      return normalized;
    }, {});
  }
}
