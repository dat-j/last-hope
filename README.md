# Facebook Chatbot Workflow Builder

## Tổng quan
Ứng dụng tạo workflow cho chatbot Facebook Messenger với giao diện kéo thả trực quan, tương tự fchat.vn.

## Kiến trúc hệ thống

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │◄──►│   Backend   │◄──►│  Database   │
│(React Flow) │    │ (NestJS +   │    │(PostgreSQL) │
│             │    │  XState)    │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
       ▲                   ▲
       │                   │
       ▼                   ▼
┌─────────────┐    ┌─────────────┐
│    User     │    │     n8n     │
│  (Web UI)   │    │(Automation) │
└─────────────┘    └─────────────┘
                           ▲
                           │
                           ▼
                  ┌─────────────┐
                  │  Facebook   │
                  │ Messenger   │
                  └─────────────┘
```

## Thành phần chính

### 1. Frontend (React + React Flow)
- Giao diện drag & drop để tạo workflow
- Mỗi node là một câu trả lời của bot
- Hỗ trợ thêm button (tối đa 3 button/node)
- UI modern, responsive

### 2. Backend (NestJS + XState)
- API để quản lý workflow
- Xử lý logic flow với XState
- Endpoint xử lý message từ user
- Database integration

### 3. Database (PostgreSQL)
- Lưu trữ workflow
- User data
- Chat history

### 4. n8n Workflow
- Nhận webhook từ Facebook
- Gọi API backend xử lý
- Gửi response qua Facebook Graph API

## Cài đặt

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- PostgreSQL

### Quick Start

1. Clone repository
```bash
git clone [repo-url]
cd facebook-chatbot-workflow
```

2. Start database
```bash
cd database
docker-compose up -d
```

3. Start backend
```bash
cd backend
npm install
npm run start:dev
```

4. Start frontend
```bash
cd frontend
npm install
npm start
```

5. Import n8n workflow
```bash
# Import workflow từ n8n-workflows/facebook-messenger-workflow.json
```

## Technology Stack

### Frontend
- React 18
- React Flow
- TypeScript
- Tailwind CSS
- Zustand (state management)

### Backend
- NestJS
- XState
- TypeORM
- PostgreSQL
- JWT Authentication

### Infrastructure
- Docker
- n8n
- Facebook Graph API

## Development

### Cấu trúc project
```
├── frontend/           # React application
├── backend/           # NestJS API
├── database/          # Database setup
├── n8n-workflows/     # n8n workflow definitions
└── docs/             # Documentation
```

### API Endpoints
- `POST /api/workflows` - Tạo workflow mới
- `GET /api/workflows/:id` - Lấy workflow
- `PUT /api/workflows/:id` - Cập nhật workflow
- `POST /api/chat/message` - Xử lý message từ user

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/chatbot_db
JWT_SECRET=your-jwt-secret
FACEBOOK_ACCESS_TOKEN=your-facebook-token

# Frontend
REACT_APP_API_URL=http://localhost:3001/api
```

## License
MIT License 