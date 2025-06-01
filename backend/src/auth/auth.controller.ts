import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  Request,
  ValidationPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    try {
      const result = await this.authService.getProfile(req.user.id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyToken(@Request() req) {
    return {
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
      },
    };
  }

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