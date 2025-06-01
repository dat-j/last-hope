import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { FacebookService } from './facebook.service';
import { FacebookPageConnectDto } from '../auth/dto/facebook-page-connect.dto';
import { FacebookOAuthCallbackDto } from './dto/facebook-oauth-callback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('facebook')
@UseGuards(JwtAuthGuard)
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @Post('oauth/callback')
  async handleOAuthCallback(
    @Request() req,
    @Body(ValidationPipe) callbackDto: FacebookOAuthCallbackDto,
  ) {
    try {
      const result = await this.facebookService.handleOAuthCallback(req.user.id, callbackDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('pages/connect')
  async connectPage(
    @Request() req,
    @Body(ValidationPipe) connectDto: FacebookPageConnectDto,
  ) {
    try {
      const result = await this.facebookService.connectPage(req.user.id, connectDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete('pages/:pageId/disconnect')
  async disconnectPage(@Request() req, @Param('pageId') pageId: string) {
    try {
      const result = await this.facebookService.disconnectPage(req.user.id, pageId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('pages')
  async getConnectedPages(@Request() req) {
    try {
      const pages = await this.facebookService.getConnectedPages(req.user.id);
      return pages.map(page => ({
        id: page.id,
        name: page.name,
        picture: page.picture,
        access_token: page.accessToken,
        category: page.category,
        followers_count: page.followersCount,
        is_connected: page.isConnected,
      }));
    } catch (error) {
      throw error;
    }
  }

  @Get('pages/:pageId/info')
  async getPageInfo(@Param('pageId') pageId: string) {
    try {
      const pageInfo = await this.facebookService.getPageInfo(pageId);
      return pageInfo;
    } catch (error) {
      throw error;
    }
  }

  @Post('pages/:pageId/webhook')
  async setupWebhook(@Request() req, @Param('pageId') pageId: string) {
    try {
      await this.facebookService.setupWebhook(req.user.id, pageId);
      return { message: 'Webhook đã được thiết lập thành công' };
    } catch (error) {
      throw error;
    }
  }
} 