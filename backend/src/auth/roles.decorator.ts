import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export type RoleType = Role;
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
