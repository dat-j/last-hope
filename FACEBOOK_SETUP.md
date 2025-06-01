# Hướng dẫn cấu hình Facebook OAuth

## 1. Tạo Facebook App

1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Tạo một ứng dụng mới (App Type: Business)
3. Thêm sản phẩm "Facebook Login" vào ứng dụng

## 2. Cấu hình Facebook App

### Valid OAuth Redirect URIs
Thêm các URL redirect sau vào Facebook App:
```
http://localhost:3000/facebook/callback
https://yourdomain.com/facebook/callback
```

### App Permissions
Yêu cầu các quyền sau:
- `pages_manage_metadata`
- `pages_read_engagement` 
- `pages_show_list`

## 3. Cấu hình Backend (.env)

Tạo file `.env` trong thư mục `backend/` với nội dung:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=last_hope_db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Facebook App Configuration
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
FACEBOOK_APP_ACCESS_TOKEN=your_facebook_app_access_token_here

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## 4. Cấu hình Frontend (.env)

Tạo file `.env` trong thư mục `frontend/` với nội dung:

```env
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id_here
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_FRONTEND_URL=http://localhost:3000
```

## 5. Flow hoạt động

1. **User click "Kết nối Facebook"** → Chuyển hướng đến Facebook OAuth
2. **Facebook OAuth Dialog** → User cấp quyền truy cập pages
3. **Callback với authorization code** → Backend exchange code lấy access_token
4. **Lấy danh sách pages** → Backend gọi Facebook API lấy pages của user
5. **Lưu vào database** → Lưu page_id và access_token vào bảng facebook_pages

## 6. Database Schema

Bảng `facebook_pages` cần có các trường:
- `id` (varchar): Facebook Page ID
- `name` (varchar): Tên trang
- `picture` (varchar): URL avatar trang
- `access_token` (text): Page access token
- `category` (varchar): Loại trang
- `followers_count` (int): Số người theo dõi
- `is_connected` (boolean): Trạng thái kết nối
- `user_id` (varchar): ID của user sở hữu
- `created_at`, `updated_at`: Timestamps

## 7. Testing

1. Khởi động backend: `cd backend && npm run start:dev`
2. Khởi động frontend: `cd frontend && npm start`
3. Truy cập `http://localhost:3000` và test chức năng kết nối Facebook

## Troubleshooting

### Lỗi "Invalid OAuth redirect URI"
- Kiểm tra URL redirect trong Facebook App Settings
- Đảm bảo URL chính xác bao gồm protocol (http/https)

### Lỗi "Invalid access token"
- Kiểm tra FACEBOOK_APP_ID và FACEBOOK_APP_SECRET
- Đảm bảo App đã được Review và phê duyệt (nếu cần)

### Lỗi CORS
- Kiểm tra cấu hình CORS trong backend
- Đảm bảo FRONTEND_URL được config đúng 