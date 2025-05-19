import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      status: 'online',
      name: 'SQL Learning Platform API',
      version: '1.0.0',
      description: 'Backend API for the SQL learning platform'
    };
  }
}
