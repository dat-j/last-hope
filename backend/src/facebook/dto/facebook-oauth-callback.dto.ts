import { IsNotEmpty, IsString } from 'class-validator';

export class FacebookOAuthCallbackDto {
  @IsNotEmpty({ message: 'Authorization code là bắt buộc' })
  @IsString({ message: 'Authorization code phải là chuỗi' })
  code: string;

  @IsNotEmpty({ message: 'State là bắt buộc' })
  @IsString({ message: 'State phải là chuỗi' })
  state: string;

  @IsNotEmpty({ message: 'Redirect URI là bắt buộc' })
  @IsString({ message: 'Redirect URI phải là chuỗi' })
  redirectUri: string;
} 