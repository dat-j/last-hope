import { IsNotEmpty, IsString } from 'class-validator';

export class FacebookPageConnectDto {
  @IsNotEmpty({ message: 'Page ID là bắt buộc' })
  @IsString({ message: 'Page ID phải là chuỗi' })
  pageId: string;

  @IsNotEmpty({ message: 'Access token là bắt buộc' })
  @IsString({ message: 'Access token phải là chuỗi' })
  accessToken: string;
} 