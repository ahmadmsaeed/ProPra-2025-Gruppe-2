import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BlockedUserGuard } from './blocked-user.guard';

/**
 * Controller für Authentifizierungs-Endpunkte: Registrierung, Login, Profil.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  /**
   * Registrierung eines neuen Users.
   */
  @Post('register')
  async register(@Body() dto: { email: string; password: string; name: string }) {
    return this.authService.register(dto);
  }

  /**
   * Login eines Users. Gibt bei Erfolg ein JWT zurück.
   */
  @Post('login')
  async login(@Body() dto: { email: string; password: string }) {
    return this.authService.login(dto);
  }

  /**
   * Gibt die eigenen Userdaten zurück (nur mit gültigem JWT).
   */
  @UseGuards(JwtAuthGuard, BlockedUserGuard)
  @Get('me')
  async me(@Req() req) {
    return this.authService.me(req.user);
  }
}
