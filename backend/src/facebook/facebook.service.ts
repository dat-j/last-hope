import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FacebookPage } from '../entities/facebook-page.entity';
import { User } from '../entities/user.entity';
import { FacebookPageConnectDto } from '../auth/dto/facebook-page-connect.dto';
import { FacebookOAuthCallbackDto } from './dto/facebook-oauth-callback.dto';
import { UserResponse } from '../auth/interfaces/auth-response.interface';
import axios from 'axios';

@Injectable()
export class FacebookService {
  constructor(
    @InjectRepository(FacebookPage)
    private facebookPageRepository: Repository<FacebookPage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async handleOAuthCallback(userId: string, callbackDto: FacebookOAuthCallbackDto): Promise<UserResponse> {
    const { code, redirectUri } = callbackDto;

    try {
      // Exchange authorization code for access token
      const userAccessToken = await this.exchangeCodeForToken(code, redirectUri);
      
      // Get user's pages
      const userPages = await this.getUserPages(userAccessToken);
      
      // Save/update all pages for this user
      for (const pageData of userPages) {
        await this.saveOrUpdatePage(userId, pageData);
      }

      // Return updated user with pages
      return this.getUserWithPages(userId);
    } catch (error) {
      throw new BadRequestException('Không thể xử lý callback Facebook: ' + error.message);
    }
  }

  private async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: redirectUri,
          code: code,
        },
      });

      return response.data.access_token;
    } catch (error) {
      throw new BadRequestException('Không thể lấy access token từ Facebook');
    }
  }

  private async getUserPages(userAccessToken: string): Promise<any[]> {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: {
          access_token: userAccessToken,
          fields: 'id,name,picture,category,followers_count,access_token',
        },
      });

      return response.data.data || [];
    } catch (error) {
      throw new BadRequestException('Không thể lấy danh sách trang Facebook');
    }
  }

  private async saveOrUpdatePage(userId: string, pageData: any): Promise<void> {
    try {
      // Check if page already exists
      const existingPage = await this.facebookPageRepository.findOne({
        where: { id: pageData.id, userId },
      });

      if (existingPage) {
        // Update existing page
        existingPage.accessToken = pageData.access_token;
        existingPage.name = pageData.name;
        existingPage.picture = pageData.picture?.data?.url;
        existingPage.category = pageData.category;
        existingPage.followersCount = pageData.followers_count;
        existingPage.isConnected = true;
        await this.facebookPageRepository.save(existingPage);
      } else {
        // Create new page
        const facebookPage = this.facebookPageRepository.create({
          id: pageData.id,
          name: pageData.name,
          picture: pageData.picture?.data?.url,
          accessToken: pageData.access_token,
          category: pageData.category,
          followersCount: pageData.followers_count,
          isConnected: true,
          userId,
        });
        await this.facebookPageRepository.save(facebookPage);
      }
    } catch (error) {
      console.error('Error saving page:', error);
      // Don't throw here to avoid breaking the whole process for one page
    }
  }

  async connectPage(userId: string, connectDto: FacebookPageConnectDto): Promise<UserResponse> {
    const { pageId, accessToken } = connectDto;

    try {
      // Verify the page access token and get page info
      const pageInfo = await this.getPageInfo(pageId, accessToken);

      // Check if page is already connected to this user
      const existingPage = await this.facebookPageRepository.findOne({
        where: { id: pageId, userId },
      });

      if (existingPage) {
        // Update existing page
        existingPage.accessToken = accessToken;
        existingPage.name = pageInfo.name;
        existingPage.picture = pageInfo.picture?.data?.url;
        existingPage.category = pageInfo.category;
        existingPage.followersCount = pageInfo.followers_count;
        existingPage.isConnected = true;
        await this.facebookPageRepository.save(existingPage);
      } else {
        // Create new page connection
        const facebookPage = this.facebookPageRepository.create({
          id: pageId,
          name: pageInfo.name,
          picture: pageInfo.picture?.data?.url,
          accessToken,
          category: pageInfo.category,
          followersCount: pageInfo.followers_count,
          isConnected: true,
          userId,
        });
        await this.facebookPageRepository.save(facebookPage);
      }

      // Return updated user with pages
      return this.getUserWithPages(userId);
    } catch (error) {
      throw new BadRequestException('Không thể kết nối trang Facebook: ' + error.message);
    }
  }

  async disconnectPage(userId: string, pageId: string): Promise<UserResponse> {
    const page = await this.facebookPageRepository.findOne({
      where: { id: pageId, userId },
    });

    if (!page) {
      throw new NotFoundException('Trang Facebook không tồn tại');
    }

    // Mark as disconnected instead of deleting to preserve data
    page.isConnected = false;
    await this.facebookPageRepository.save(page);

    // Return updated user with pages
    return this.getUserWithPages(userId);
  }

  async getConnectedPages(userId: string): Promise<FacebookPage[]> {
    return this.facebookPageRepository.find({
      where: { userId, isConnected: true },
    });
  }

  async getPageInfo(pageId: string, accessToken?: string): Promise<any> {
    try {
      const token = accessToken || process.env.FACEBOOK_APP_ACCESS_TOKEN;
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}`,
        {
          params: {
            fields: 'id,name,picture,category,followers_count',
            access_token: token,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException('Không thể lấy thông tin trang Facebook');
    }
  }

  async setupWebhook(userId: string, pageId: string): Promise<void> {
    const page = await this.facebookPageRepository.findOne({
      where: { id: pageId, userId, isConnected: true },
    });

    if (!page) {
      throw new NotFoundException('Trang Facebook không tồn tại hoặc chưa được kết nối');
    }

    try {
      // Subscribe to page webhooks
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
        {
          subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads',
        },
        {
          params: {
            access_token: page.accessToken,
          },
        }
      );

      if (response.data.success) {
        page.webhookVerified = true;
        await this.facebookPageRepository.save(page);
      }
    } catch (error) {
      throw new BadRequestException('Không thể thiết lập webhook: ' + error.message);
    }
  }

  private async getUserWithPages(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['facebookPages'],
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.createdAt,
      facebookPages: user.facebookPages
        ?.filter(page => page.isConnected)
        .map(page => ({
          id: page.id,
          name: page.name,
          picture: page.picture,
          access_token: page.accessToken,
          category: page.category,
          followers_count: page.followersCount,
          is_connected: page.isConnected,
        })),
    };
  }
} 