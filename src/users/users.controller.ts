import { Body, Controller, Get, Post } from '@nestjs/common';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('profile')
  async updateProfile(
    @Body()
    body: {
      userId?: string;
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
  ) {
    const userId = body.userId;
    if (!userId) {
      return { user: null };
    }

    const name = body.name?.trim();
    const user = await this.usersService.updateProfile(userId, {
      name,
      firstName: body.firstName,
      lastName: body.lastName,
      about: body.about,
      favoriteColor: body.favoriteColor,
      nickname: body.nickname,
      favoriteFood: body.favoriteFood,
      participationYears: body.participationYears,
      pastExperience: body.pastExperience,
      showProfile: body.showProfile,
      picture: body.picture,
    });

    if (!user) {
      return { user: null };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        about: user.about,
        favoriteColor: user.favoriteColor,
        nickname: user.nickname,
        favoriteFood: user.favoriteFood,
        participationYears: user.participationYears,
        pastExperience: user.pastExperience,
        showProfile: user.showProfile,
        picture: user.picture,
      },
    };
  }

  @Post('profile-picture')
  async uploadProfilePicture(
    @Body() body: { userId?: string; email?: string; imageBase64?: string },
  ) {
    if (!body.imageBase64) {
      return { url: null, user: null };
    }

    let userId = body.userId;
    if (!userId && body.email) {
      const userByEmail = await this.usersService.findByEmail(body.email);
      userId = userByEmail?.id;
    }

    if (!userId) {
      return { url: null, user: null };
    }

    const url = await this.usersService.uploadProfilePicture(body.imageBase64);
    const user = await this.usersService.updateProfile(userId, { picture: url });

    if (!user) {
      return { url, user: null };
    }

    return {
      url,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        about: user.about,
        favoriteColor: user.favoriteColor,
        nickname: user.nickname,
        favoriteFood: user.favoriteFood,
        participationYears: user.participationYears,
        showProfile: user.showProfile,
        picture: user.picture,
      },
    };
  }

  @Get('public')
  async listPublicProfiles() {
    const users = await this.usersService.findVisibleParticipants();
    return {
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        favoriteFood: user.favoriteFood,
        pastExperience: user.pastExperience,
        about: user.about,
        favoriteColor: user.favoriteColor,
        participationYears: user.participationYears,
        picture: user.picture,
      })),
    };
  }
}
