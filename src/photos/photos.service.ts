import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Model } from 'mongoose';

import { Photo, PhotoDocument } from './photo.schema';

@Injectable()
export class PhotosService {
  private cloudinaryReady = false;

  constructor(
    @InjectModel(Photo.name) private readonly photoModel: Model<PhotoDocument>,
    private readonly configService: ConfigService,
  ) {
    const cloudinaryUrl =
      this.configService.get<string>('CLOUDINARY_URL') ?? process.env.CLOUDINARY_URL;
    if (cloudinaryUrl) {
      this.configureCloudinary(cloudinaryUrl);
    }
  }

  async uploadPhoto(userId: string, year: number, imageBase64: string): Promise<Photo> {
    const url = await this.uploadToCloudinary(imageBase64);
    const photo = new this.photoModel({ url, year, userId });
    await photo.save();
    return photo;
  }

  async getYearSummary(years: number[]): Promise<Record<number, number>> {
    const summary = await this.photoModel.aggregate([
      { $addFields: { yearInt: { $toInt: '$year' } } },
      { $match: { yearInt: { $in: years } } },
      { $group: { _id: '$yearInt', count: { $sum: 1 } } },
    ]);

    const result: Record<number, number> = {};
    years.forEach((year) => {
      result[year] = 0;
    });
    summary.forEach((row: { _id: number; count: number }) => {
      result[row._id] = row.count;
    });

    return result;
  }

  async getCoverByYear(years: number[]): Promise<Record<number, string>> {
    const rows = await this.photoModel.aggregate([
      { $addFields: { yearInt: { $toInt: '$year' } } },
      { $match: { yearInt: { $in: years } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$yearInt',
          url: { $first: '$url' },
        },
      },
    ]);

    const result: Record<number, string> = {};
    rows.forEach((row: { _id: number; url?: string }) => {
      if (row.url) {
        result[row._id] = row.url;
      }
    });

    return result;
  }

  async getByYear(year: number): Promise<Photo[]> {
    return this.photoModel.find({ year }).sort({ createdAt: -1 }).exec();
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
      folder: 'boat_trip/gallery',
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
