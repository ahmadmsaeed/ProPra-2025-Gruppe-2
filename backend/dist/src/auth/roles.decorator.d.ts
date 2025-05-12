export declare const ROLES_KEY = "roles";
export type RoleType = 'STUDENT' | 'TEACHER' | 'TUTOR';
export declare const Roles: (...roles: RoleType[]) => import("@nestjs/common").CustomDecorator<string>;
