import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API info object', () => {
      const result = appController.getHello();
      expect(result).toEqual({
        status: 'online',
        name: 'SQL Learning Platform API',
        version: '1.0.0',
        description: 'Backend API for the SQL learning platform',
      });
    });
  });
});
