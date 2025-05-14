import { Injectable, HttpException, HttpStatus, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

/**
 * Service für Authentifizierung und User-Management.
 */
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  /**
   * Registriert einen neuen User mit gehashtem Passwort.
   */
  async register(dto: { email: string; password: string; name: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new HttpException('E-Mail bereits vergeben', HttpStatus.BAD_REQUEST);
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hash, name: dto.name },
    });
    return { id: user.id, email: user.email, name: user.name };
  }

  /**
   * Login: Validiert User und gibt ein JWT zurück.
   */
  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });    if (!user) {
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    // Check if user is blocked BEFORE checking password
    if (user.isBlocked) {
        throw new ForbiddenException('Ihr Konto ist gesperrt. Bitte kontaktieren Sie den Support.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwt.sign(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }, // Return basic user info
    };
  }
  /**
   * Gibt die Userdaten für den eingeloggten User zurück.
   */
  async me(user: { sub: number; email: string; role: string }) {
    // User is already authenticated by JwtAuthGuard and checked by BlockedUserGuard
    // We can fetch fresh data if needed, but guards already did the checks.
    const dbUser = await this.prisma.user.findUnique({ 
      where: { id: user.sub }, 
      select: { id: true, email: true, name: true, role: true, isBlocked: true } 
    });
    
    if (!dbUser) throw new NotFoundException('Benutzer nicht gefunden'); // Should not happen if JWT is valid
    // No need to check isBlocked again here, guard does it.
    return dbUser;
  }
}