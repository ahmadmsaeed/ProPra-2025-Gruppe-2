
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Guard für JWT-geschützte Endpunkte.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const can = await super.canActivate(context);
    if (!can) return false;
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.sub;
    if (!userId) return false;
    // Prüfe, ob User gesperrt ist
    const prisma = this.prisma || new (require('../prisma/prisma.service').PrismaService)();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.isBlocked) {
      throw new UnauthorizedException('Account ist gesperrt. Bitte wende dich an den Support.');
    }
    return true;
  }
}
