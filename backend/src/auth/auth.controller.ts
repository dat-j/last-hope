import { Controller, Post, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('init-test-user')
  async initTestUser() {
    try {
      const user = await this.authService.findOrCreateTestUser();
      return {
        message: 'Test user created/found successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      return {
        message: 'Error creating test user',
        error: error.message,
      };
    }
  }

  @Get('test-user')
  async getTestUser() {
    try {
      const user = await this.authService.findUserByEmail('admin@chatbot.local');
      if (!user) {
        return { message: 'Test user not found' };
      }
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      return {
        message: 'Error fetching test user',
        error: error.message,
      };
    }
  }
} 