import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

interface JwtPayload {
  sub: number;
  email: string;
  name?: string;
  role: string;
}

/**
 * JWT-Strategie für Passport. Extrahiert und validiert das JWT aus dem Authorization-Header.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    // Gibt das Payload als req.user weiter (inkl. Rolle, falls vorhanden)
    try {
      const userId = payload.sub;
      const userEmail = payload.email;
      const userName = payload.name;
      const userRole = payload.role;

      return {
        sub: userId,
        email: userEmail,
        name: userName,
        role: userRole,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`JWT validation failed: ${errorMessage}`);
    }
  }
}
