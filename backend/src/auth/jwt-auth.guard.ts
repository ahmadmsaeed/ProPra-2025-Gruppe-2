import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
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

    if (!userId || typeof userId !== 'number') {
      throw new UnauthorizedException('Invalid authorization token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isBlocked: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException(
        'Account is blocked. Please contact support.',
      );
    }

    return true;
  }
}
