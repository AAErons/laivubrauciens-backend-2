import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcryptjs';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly client: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    this.client = new OAuth2Client(clientId);
  }

  async loginWithGoogle(credential?: string) {
    if (!credential) {
      throw new UnauthorizedException('Missing Google credential');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: credential,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const user = await this.usersService.findOrCreateFromGoogle({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
      picture: payload.picture,
    });

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

  async registerWithPassword(body: { email?: string; name?: string; password?: string }) {
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const password = body.password;

    if (!email || !password) {
      throw new BadRequestException('Missing email or password');
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing?.passwordHash) {
      throw new BadRequestException('Email already registered');
    }
    if (existing && !existing.passwordHash) {
      throw new BadRequestException('Email registered with Google');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ');
    const user = await this.usersService.createWithPassword({
      email,
      name: name || email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      passwordHash,
    });

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

  async loginWithPassword(body: { email?: string; password?: string }) {
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      throw new BadRequestException('Missing email or password');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
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
}
