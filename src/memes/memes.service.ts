import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Model } from 'mongoose';

import { Meme, MemeDocument } from './meme.schema';

@Injectable()
export class MemesService {
  private cloudinaryReady = false;

  constructor(
    @InjectModel(Meme.name) private readonly memeModel: Model<MemeDocument>,
    private readonly configService: ConfigService,
  ) {
    const cloudinaryUrl =
      this.configService.get<string>('CLOUDINARY_URL') ?? process.env.CLOUDINARY_URL;
    if (cloudinaryUrl) {
      this.configureCloudinary(cloudinaryUrl);
    }
  }

  async createMeme(
    userId: string,
    payload: {
      imageBase64: string;
      topText?: string;
      bottomText?: string;
      topSize?: number;
      bottomSize?: number;
    },
  ): Promise<Meme> {
    const existing = await this.memeModel.findOne({ userId }).exec();
    if (existing) {
      return existing;
    }

    const url = await this.uploadToCloudinary(payload.imageBase64);
    const meme = new this.memeModel({
      url,
      userId,
      topText: payload.topText ?? '',
      bottomText: payload.bottomText ?? '',
      topSize: this.clampSize(payload.topSize),
      bottomSize: this.clampSize(payload.bottomSize),
    });
    await meme.save();
    return meme;
  }

  async listMemes(): Promise<Meme[]> {
    return this.memeModel.find().sort({ createdAt: -1 }).exec();
  }

  async getByUser(userId: string): Promise<Meme | null> {
    return this.memeModel.findOne({ userId }).exec();
  }

  async updateMeme(
    userId: string,
    payload: {
      imageBase64?: string;
      topText?: string;
      bottomText?: string;
      topSize?: number;
      bottomSize?: number;
    },
  ): Promise<Meme | null> {
    const meme = await this.memeModel.findOne({ userId }).exec();
    if (!meme) {
      return null;
    }
    if (payload.imageBase64) {
      meme.url = await this.uploadToCloudinary(payload.imageBase64);
    }
    if (payload.topText !== undefined) {
      meme.topText = payload.topText;
    }
    if (payload.bottomText !== undefined) {
      meme.bottomText = payload.bottomText;
    }
    if (payload.topSize !== undefined) {
      meme.topSize = this.clampSize(payload.topSize);
    }
    if (payload.bottomSize !== undefined) {
      meme.bottomSize = this.clampSize(payload.bottomSize);
    }
    await meme.save();
    return meme;
  }

  async deleteMeme(userId: string): Promise<boolean> {
    const result = await this.memeModel.deleteOne({ userId }).exec();
    return result.deletedCount === 1;
  }

  private clampSize(size?: number) {
    const value = Number(size);
    if (Number.isNaN(value)) {
      return 28;
    }
    return Math.max(16, Math.min(48, value));
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
      folder: 'boat_trip/memes',
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
    } catch (error) {
      this.cloudinaryReady = false;
    }
  }
}
