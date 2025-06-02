import { Role } from '@prisma/client';
export declare const ROLES_KEY = "roles";
export type RoleType = Role;
export declare const Roles: (...roles: RoleType[]) => import("@nestjs/common").CustomDecorator<string>;
