/**
 * Controller for authentication endpoints: registration, login, profile, and user management.
 * Handles JWT-protected routes for user info and profile updates.
 */
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
   * Registers a new user.
   */
  @Post('register')
  async register(@Body() dto: { email: string; password: string; name: string }) {
    return this.authService.register(dto);
  }

  /**
   * Logs in a user and returns a JWT on success.
   */
  @Post('login')
  async login(@Body() dto: { email: string; password: string }) {
    return this.authService.login(dto);
  }

  /**
   * Returns the current user's data (JWT required).
   */
  @UseGuards(JwtAuthGuard, BlockedUserGuard)
  @Get('me')
  async me(@Req() req) {
    return this.authService.me(req.user);
  }

  /**
   * Updates the user's profile (name/email).
   */
  @UseGuards(JwtAuthGuard)
  @Post('update-profile')
  async updateProfile(@Req() req, @Body() dto: { name: string; email: string }) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  /**
   * Changes the user's password (requires current password).
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req, @Body() dto: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.sub, dto);
  }
}
