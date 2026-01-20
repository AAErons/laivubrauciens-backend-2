import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  async loginWithGoogle(@Body('credential') credential: string) {
    return this.authService.loginWithGoogle(credential);
  }

  @Post('register')
  async register(@Body() body: { email?: string; name?: string; password?: string }) {
    return this.authService.registerWithPassword(body);
  }

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    return this.authService.loginWithPassword(body);
  }
}
