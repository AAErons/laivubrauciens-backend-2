import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Model } from 'mongoose';

import {
  SelfieEntry,
  SelfieEntryDocument,
  SelfieModerationStatus,
} from './selfie-entry.schema';

@Injectable()
export class SelfieService {
  private cloudinaryReady = false;

  constructor(
    @InjectModel(SelfieEntry.name) private readonly selfieModel: Model<SelfieEntryDocument>,
    private readonly configService: ConfigService,
  ) {
    const cloudinaryUrl =
      this.configService.get<string>('CLOUDINARY_URL') ?? process.env.CLOUDINARY_URL;
    if (cloudinaryUrl) {
      this.configureCloudinary(cloudinaryUrl);
    }
  }

  async getTodayByUser(userId: string): Promise<SelfieEntry | null> {
    const dateKey = this.getTodayDateKey();
    return this.selfieModel.findOne({ userId, dateKey }).exec();
  }

  async createTodayEntry(
    userId: string,
    payload: {
      imageBase64: string;
      showToOthers?: boolean;
      category?: string;
    },
  ): Promise<{ entry: SelfieEntry; created: boolean }> {
    const dateKey = this.getTodayDateKey();
    const existing = await this.selfieModel.findOne({ userId, dateKey }).exec();
    if (existing) {
      return { entry: existing, created: false };
    }

    const url = await this.uploadToCloudinary(payload.imageBase64);
    const entry = new this.selfieModel({
      userId,
      url,
      dateKey,
      showToOthers: Boolean(payload.showToOthers),
      moderationStatus: 'pending',
      category: this.normalizeCategory(payload.category),
    });
    await entry.save();
    return { entry, created: true };
  }

  async updateTodayEntry(
    userId: string,
    payload: {
      imageBase64?: string;
      showToOthers?: boolean;
      category?: string;
    },
  ): Promise<SelfieEntry | null> {
    const dateKey = this.getTodayDateKey();
    const entry = await this.selfieModel.findOne({ userId, dateKey }).exec();
    if (!entry) {
      return null;
    }

    if (payload.imageBase64) {
      entry.url = await this.uploadToCloudinary(payload.imageBase64);
    }
    if (payload.showToOthers !== undefined) {
      entry.showToOthers = Boolean(payload.showToOthers);
    }
    if (payload.category !== undefined) {
      entry.category = this.normalizeCategory(payload.category);
    }
    entry.moderationStatus = 'pending';
    entry.adminApproved = false;

    await entry.save();
    return entry;
  }

  async listPublicApprovedToday(): Promise<SelfieEntry[]> {
    const dateKey = this.getTodayDateKey();
    const entries = await this.selfieModel
      .find({ dateKey, showToOthers: true })
      .sort({ createdAt: -1 })
      .exec();
    return entries.filter((entry) => this.getModerationStatus(entry) === 'approved');
  }

  async getAddedDaysCount(userId: string): Promise<number> {
    return this.selfieModel.countDocuments({ userId }).exec();
  }

  async listTodayAll(): Promise<SelfieEntry[]> {
    const dateKey = this.getTodayDateKey();
    return this.selfieModel.find({ dateKey }).sort({ createdAt: -1 }).exec();
  }

  async setAdminApproval(entryId: string, approved: boolean): Promise<SelfieEntry | null> {
    const entry = await this.selfieModel.findById(entryId).exec();
    if (!entry) {
      return null;
    }
    entry.moderationStatus = approved ? 'approved' : 'rejected';
    entry.adminApproved = approved;
    await entry.save();
    return entry;
  }

  getModerationStatus(entry: SelfieEntry): SelfieModerationStatus {
    const status = (entry as { moderationStatus?: string }).moderationStatus;
    if (status === 'approved' || status === 'rejected' || status === 'pending') {
      return status;
    }
    return entry.adminApproved ? 'approved' : 'pending';
  }

  private getTodayDateKey() {
    return new Date().toISOString().slice(0, 10);
  }

  private normalizeCategory(category?: string) {
    return (category ?? '').trim().slice(0, 80);
  }

  private async uploadToCloudinary(imageBase64: string): Promise<string> {
    const cloudinaryUrl =
      this.configService.get<string>('CLOUDINARY_URL') ?? process.env.CLOUDINARY_URL;
    if (!cloudinaryUrl) {
      throw new Error('Cloudinary is not configured');
    }

    if (!this.cloudinaryReady) {
      this.configureCloudinary(cloudinaryUrl);
    }

    const upload = await cloudinary.uploader.upload(imageBase64, {
      folder: 'boat_trip/selfie_challenge',
      resource_type: 'image',
    });

    return upload.secure_url;
  }

  private configureCloudinary(cloudinaryUrl: string) {
    try {
      const parsed = new URL(cloudinaryUrl);
      cloudinary.config({
        cloud_name: parsed.hostname,
        api_key: parsed.username,
        api_secret: parsed.password,
        secure: true,
      });
      this.cloudinaryReady = true;
    } catch {
      this.cloudinaryReady = false;
    }
  }
}
