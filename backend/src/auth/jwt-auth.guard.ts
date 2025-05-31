import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get or create test user and add to request
    return this.authService.findOrCreateTestUser().then(user => {
      request.user = {
        userId: user.id,
        email: user.email,
      };
      return true;
    }).catch(() => {
      // Fallback to original mock for development
      request.user = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@chatbot.local',
      };
      return true;
    });
  }
} 