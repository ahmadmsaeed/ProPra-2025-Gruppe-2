/**
 * Main application controller for health and root endpoints.
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Root endpoint: returns API status and metadata.
   */
  @Get()
  getHello(): object {
    return this.appService.getHello();
  }
  
  /**
   * Health check endpoint.
   */
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
