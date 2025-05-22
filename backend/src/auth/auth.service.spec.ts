import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { HttpException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };
    jwt = { sign: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should throw if user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'a@b.de', password: 'pw' }),
    ).rejects.toThrow(HttpException);
  });

  it('should throw if password is wrong', async () => {
    prisma.user.findUnique.mockResolvedValue({
      email: 'a@b.de',
      password: 'hashed',
      id: 1,
      name: 'Test',
    });
    // bcrypt.compare will be false
    jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);
    await expect(
      service.login({ email: 'a@b.de', password: 'pw' }),
    ).rejects.toThrow(HttpException);
  });

  it('should return token and user if login is correct', async () => {
    prisma.user.findUnique.mockResolvedValue({
      email: 'a@b.de',
      password: 'hashed',
      id: 1,
      name: 'Test',
    });
    jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);
    jwt.sign.mockReturnValue('jwt-token');
    const result = await service.login({ email: 'a@b.de', password: 'pw' });
    expect(result).toEqual({
      access_token: 'jwt-token',
      user: { id: 1, email: 'a@b.de', name: 'Test' },
    });
  });
});
