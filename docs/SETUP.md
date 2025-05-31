# Hướng dẫn Setup và Chạy Dự án

## Tổng quan
Dự án Facebook Chatbot Workflow Builder bao gồm:
- **Frontend**: React + React Flow + Tailwind CSS
- **Backend**: NestJS + XState + PostgreSQL
- **Database**: PostgreSQL với Docker
- **n8n**: Workflow automation cho Facebook Messenger

## Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- Git

## Bước 1: Clone và Setup Database

```bash
# Clone repository
git clone [repo-url]
cd facebook-chatbot-workflow

# Start PostgreSQL database
cd database
docker-compose up -d

# Kiểm tra database đã chạy
docker ps
```

Database sẽ chạy trên:
- PostgreSQL: `localhost:5432`
- PgAdmin: `http://localhost:5050` (admin@chatbot.local / admin123)

## Bước 2: Setup Backend

```bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env
cp .env.example .env

# Chỉnh sửa .env với thông tin của bạn
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_USERNAME=chatbot_user
# DATABASE_PASSWORD=chatbot_password
# DATABASE_NAME=chatbot_db
# JWT_SECRET=your_jwt_secret
# FACEBOOK_ACCESS_TOKEN=your_facebook_token

# Chạy backend
npm run start:dev
```

Backend sẽ chạy trên `http://localhost:3001/api`

## Bước 3: Setup Frontend

```bash
cd frontend

# Cài đặt dependencies
npm install

# Chạy frontend
npm start
```

Frontend sẽ chạy trên `http://localhost:3000`

## Bước 4: Setup n8n (Optional)

```bash
# Cài đặt n8n globally
npm install -g n8n

# Chạy n8n
n8n start

# Hoặc chạy với Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

n8n sẽ chạy trên `http://localhost:5678`

### Import n8n Workflow

1. Mở n8n dashboard
2. Click "Import from file"
3. Chọn file `n8n-workflows/facebook-messenger-workflow.json`
4. Cấu hình environment variables:
   - `FACEBOOK_ACCESS_TOKEN`: Token từ Facebook Developer

## Bước 5: Cấu hình Facebook App

### Tạo Facebook App
1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Tạo app mới với Messenger platform
3. Lấy Page Access Token
4. Cấu hình Webhook URL: `https://your-domain.com/webhook/facebook-webhook`

### Cấu hình Webhook
1. Webhook URL: URL từ n8n workflow
2. Verify Token: Tùy chọn
3. Subscribe to: `messages`, `messaging_postbacks`

## Cách sử dụng

### 1. Tạo Workflow
1. Mở frontend tại `http://localhost:3000`
2. Kéo thả các nodes để tạo workflow
3. Cấu hình message và buttons cho mỗi node
4. Kết nối các nodes với nhau

### 2. Test Workflow
1. Gửi tin nhắn đến Facebook Page
2. n8n sẽ nhận webhook và gọi backend API
3. Backend xử lý với XState machine
4. Trả response qua Facebook Messenger

## API Endpoints

### Workflow Management
- `GET /api/workflows` - Lấy danh sách workflows
- `POST /api/workflows` - Tạo workflow mới
- `PUT /api/workflows/:id` - Cập nhật workflow
- `DELETE /api/workflows/:id` - Xóa workflow
- `POST /api/workflows/:id/activate` - Kích hoạt workflow

### Chat Processing
- `POST /api/chat/message` - Xử lý tin nhắn từ user
- `GET /api/chat/history/:userId` - Lấy lịch sử chat
- `POST /api/chat/reset/:userId` - Reset session

## Troubleshooting

### Database Connection Error
```bash
# Kiểm tra database container
docker ps
docker logs chatbot_db

# Restart database
cd database
docker-compose restart
```

### Frontend Build Error
```bash
# Clear cache và reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend API Error
```bash
# Kiểm tra logs
npm run start:dev

# Kiểm tra database connection
# Đảm bảo .env file có thông tin đúng
```

## Development Tips

### Hot Reload
- Frontend: Tự động reload khi thay đổi code
- Backend: Sử dụng `npm run start:dev` cho hot reload

### Database Management
- Sử dụng PgAdmin tại `http://localhost:5050`
- Hoặc connect trực tiếp: `psql -h localhost -U chatbot_user -d chatbot_db`

### Testing n8n Workflow
1. Sử dụng n8n test webhook feature
2. Gửi POST request với sample Facebook webhook data
3. Kiểm tra logs trong n8n execution

## Production Deployment

### Environment Variables
```bash
# Backend
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=strong_secret_key
FACEBOOK_ACCESS_TOKEN=production_token

# Frontend
REACT_APP_API_URL=https://your-api-domain.com/api
```

### Docker Deployment
```bash
# Build và deploy với Docker
docker-compose -f docker-compose.prod.yml up -d
```

## Tính năng chính

### Frontend
- ✅ Drag & drop workflow builder
- ✅ Node editor với message và buttons
- ✅ Real-time preview
- ✅ Modern UI với Tailwind CSS

### Backend
- ✅ XState workflow engine
- ✅ PostgreSQL database
- ✅ RESTful API
- ✅ Chat session management

### Integration
- ✅ n8n workflow automation
- ✅ Facebook Messenger integration
- ✅ Webhook processing
- ✅ Button support (max 3 per message)

## Hỗ trợ
Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs của từng service
2. Đảm bảo tất cả dependencies đã được cài đặt
3. Kiểm tra network connectivity giữa các services 