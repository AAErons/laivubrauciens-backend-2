import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Model } from 'mongoose';

import { User, UserDocument } from './user.schema';

type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
};

type PasswordProfile = {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  passwordHash: string;
};

@Injectable()
export class UsersService {
  private cloudinaryReady = false;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {
    const cloudinaryUrl =
      this.configService.get<string>('CLOUDINARY_URL') ?? process.env.CLOUDINARY_URL;
    if (cloudinaryUrl) {
      this.configureCloudinary(cloudinaryUrl);
    }
  }

  async findOrCreateFromGoogle(profile: GoogleProfile): Promise<UserDocument> {
    const { googleId, email, name, picture } = profile;
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ');
    let user = await this.userModel.findOne({ googleId }).exec();

    if (!user) {
      user = await this.userModel.findOne({ email }).exec();
    }

    if (!user) {
      user = new this.userModel({
        authProvider: 'google',
        googleId,
        email,
        name,
        firstName,
        lastName,
        picture,
      });
    } else {
      user.authProvider = 'google';
      user.googleId = googleId;
      user.email = email;
      user.name = user.name || name;
      user.firstName = user.firstName ?? firstName;
      user.lastName = user.lastName ?? lastName;
      user.picture = user.picture || picture;
    }

    await user.save();
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async createWithPassword(profile: PasswordProfile): Promise<UserDocument> {
    const { email, name, firstName, lastName, passwordHash } = profile;
    const user = new this.userModel({
      authProvider: 'password',
      email,
      name,
      firstName,
      lastName,
      passwordHash,
    });

    await user.save();
    return user;
  }

  async updateProfile(
    userId: string,
    profile: {
      name?: string;
      firstName?: string;
      lastName?: string;
      about?: string;
      favoriteColor?: string;
      nickname?: string;
      favoriteFood?: string;
      participationYears?: number[];
      pastExperience?: string;
      showProfile?: boolean;
      picture?: string;
    },
  ): Promise<UserDocument | null> {
    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            name: profile.name,
            firstName: profile.firstName,
            lastName: profile.lastName,
            about: profile.about,
            favoriteColor: profile.favoriteColor,
            nickname: profile.nickname,
            favoriteFood: profile.favoriteFood,
            participationYears: profile.participationYears,
            pastExperience: profile.pastExperience,
            showProfile: profile.showProfile,
            picture: profile.picture,
          },
        },
        { new: true },
      )
      .exec();

    return updated;
  }

  async uploadProfilePicture(imageBase64: string): Promise<string> {
    const cloudinaryUrl =
      this.configService.get<string>('CLOUDINARY_URL') ?? process.env.CLOUDINARY_URL;
    if (!cloudinaryUrl) {
      throw new Error('Cloudinary is not configured');
    }

    if (!this.cloudinaryReady) {
      this.configureCloudinary(cloudinaryUrl);
    }

    const upload = await cloudinary.uploader.upload(imageBase64, {
      folder: 'boat_trip/profiles',
      resource_type: 'image',
    });

    return upload.secure_url;
  }

  async findVisibleParticipants(): Promise<UserDocument[]> {
    return this.userModel
      .find({ showProfile: true })
      .sort({ firstName: 1, lastName: 1, name: 1 })
      .exec();
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
