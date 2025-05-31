import { IsString, IsOptional } from 'class-validator';

export class ProcessMessageDto {
  @IsString()
  facebookUserId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  workflowId?: string;
} 