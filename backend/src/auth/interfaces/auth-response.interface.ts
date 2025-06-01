export interface FacebookPageResponse {
  id: string;
  name: string;
  picture?: string;
  access_token: string;
  category?: string;
  followers_count?: number;
  is_connected: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  facebookPages?: FacebookPageResponse[];
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
} 