export interface AuthenticatedUser {
  sub: number;
  email: string;
  name?: string;
  role: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
