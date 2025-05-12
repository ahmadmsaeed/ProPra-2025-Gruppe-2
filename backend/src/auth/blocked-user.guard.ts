import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path as needed

@Injectable()
export class BlockedUserGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assumes user object is attached by JwtAuthGuard

    // Only check if user is attached (meaning JWT was valid)
    if (user && user.sub) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { isBlocked: true },
      });      if (dbUser?.isBlocked) {
        // Throw ForbiddenException if user is blocked
        throw new ForbiddenException('Ihr Konto ist gesperrt. Bitte kontaktieren Sie den Support.');
      }
    }
    // If no user attached (guard runs before JWT?) or user not blocked, allow access
    return true;
  }
}
