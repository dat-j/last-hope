# API Documentation

## 🌐 **Tổng quan API**

Hệ thống cung cấp RESTful API hoàn chỉnh để quản lý workflows, xử lý chat, và tích hợp với Facebook. Tất cả APIs sử dụng JSON format và JWT authentication.

**Base URL**: `http://localhost:3001/api`

---

## 🔐 **Authentication**

### **JWT Token Authentication**
```http
Authorization: Bearer <jwt_token>
```

### **Token Lifecycle**
- **Expiration**: 24 hours
- **Refresh**: Auto-refresh trước khi expire
- **Storage**: LocalStorage hoặc Secure Cookies

---

## 📋 **API Endpoints Overview**

### **Authentication APIs** (`/auth`)
- Registration, Login, Profile management

### **Workflow APIs** (`/workflows`) 
- CRUD operations cho workflows
- Activation/Deactivation
- Node/Edge management

### **Chat APIs** (`/chat`)
- Message processing
- Session management
- History tracking

### **Facebook APIs** (`/facebook`)
- OAuth integration
- Page management
- Webhook handling

### **User APIs** (`/users`)
- User profile operations
- Settings management

---

## 🔑 **Authentication API**

### **POST /auth/register**

**Mô tả**: Đăng ký user mới

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "access_token": "jwt_token_here"
  }
}
```

**Error Responses**:
```json
// 400 - Validation Error
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}

// 409 - Conflict
{
  "success": false,
  "error": "Email already exists"
}
```

---

### **POST /auth/login**

**Mô tả**: Đăng nhập user

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "access_token": "jwt_token_here"
  }
}
```

---

### **GET /auth/profile**

**Mô tả**: Lấy thông tin profile hiện tại

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z",
    "workflows_count": 5,
    "facebook_pages_count": 2
  }
}
```

---

### **PUT /auth/profile**

**Mô tả**: Cập nhật profile

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "name": "Updated Name",
  "current_password": "old_password",
  "new_password": "new_password"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Updated Name",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 🔄 **Workflow API**

### **GET /workflows**

**Mô tả**: Lấy danh sách workflows của user

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
```
?page=1&limit=10&search=keyword&is_active=true
```

**Response**:
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "uuid",
        "name": "Customer Support Bot",
        "description": "Handles customer inquiries",
        "isActive": true,
        "nodes": [...],
        "edges": [...],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

### **POST /workflows**

**Mô tả**: Tạo workflow mới

**Headers**:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "New Workflow",
  "description": "Workflow description",
  "nodes": [
    {
      "id": "start-node",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Start",
        "message": "Xin chào! Tôi có thể giúp gì cho bạn?",
        "messageType": "text",
        "buttons": [
          {
            "title": "Menu",
            "payload": "MENU"
          },
          {
            "title": "Hỗ trợ",
            "payload": "SUPPORT"
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "start-node",
      "target": "menu-node",
      "sourceHandle": "MENU"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Workflow",
    "description": "Workflow description",
    "isActive": false,
    "nodes": [...],
    "edges": [...],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### **GET /workflows/:id**

**Mô tả**: Lấy chi tiết workflow

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Customer Support Bot",
    "description": "Handles customer inquiries",
    "isActive": true,
    "nodes": [
      {
        "id": "start-node",
        "type": "start",
        "position": { "x": 100, "y": 100 },
        "data": {
          "label": "Start",
          "message": "Xin chào!",
          "messageType": "text",
          "buttons": [...]
        }
      }
    ],
    "edges": [...],
    "analytics": {
      "total_sessions": 150,
      "total_messages": 1250,
      "avg_session_duration": 180,
      "completion_rate": 0.85
    }
  }
}
```

---

### **PUT /workflows/:id**

**Mô tả**: Cập nhật workflow

**Headers**:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Updated Workflow Name",
  "description": "Updated description",
  "nodes": [...],
  "edges": [...]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Workflow Name",
    "description": "Updated description",
    "nodes": [...],
    "edges": [...],
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### **DELETE /workflows/:id**

**Mô tả**: Xóa workflow

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

---

### **POST /workflows/:id/activate**

**Mô tả**: Kích hoạt workflow (chỉ 1 workflow active mỗi user)

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isActive": true,
    "activatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### **GET /workflows/active**

**Mô tả**: Lấy workflow đang active

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Active Workflow",
    "nodes": [...],
    "edges": [...],
    "isActive": true
  }
}
```

---

### **PATCH /workflows/:id/nodes**

**Mô tả**: Cập nhật nodes của workflow

**Headers**:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "nodes": [
    {
      "id": "updated-node",
      "type": "message",
      "position": { "x": 200, "y": 150 },
      "data": {
        "label": "Updated Node",
        "message": "Updated message content"
      }
    }
  ]
}
```

---

### **PATCH /workflows/:id/edges**

**Mô tả**: Cập nhật edges của workflow

**Headers**:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "edges": [
    {
      "id": "new-edge",
      "source": "node1",
      "target": "node2",
      "sourceHandle": "OPTION_A"
    }
  ]
}
```

---

## 💬 **Chat API**

### **POST /chat/message**

**Mô tả**: Xử lý message từ user (for testing)

**Headers**:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "message": "Hello",
  "facebookUserId": "facebook_user_123",
  "workflowId": "workflow_uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "response": "Xin chào! Tôi có thể giúp gì cho bạn?",
    "currentNode": "start-node",
    "sessionId": "session_uuid",
    "matched": true,
    "buttons": [
      {
        "title": "Menu",
        "payload": "MENU"
      }
    ]
  }
}
```

---

### **GET /chat/sessions**

**Mô tả**: Lấy danh sách chat sessions

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
```
?page=1&limit=20&workflow_id=uuid&facebook_user_id=123
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "facebookUserId": "facebook_user_123",
        "workflowId": "workflow_uuid",
        "currentState": "waiting",
        "context": {...},
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "messages_count": 15,
        "last_message": "Hello"
      }
    ],
    "pagination": {...}
  }
}
```

---

### **GET /chat/sessions/:id**

**Mô tả**: Lấy chi tiết session và messages

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "facebookUserId": "facebook_user_123",
      "workflowId": "workflow_uuid",
      "currentState": "waiting",
      "context": {...},
      "created_at": "2024-01-01T00:00:00Z"
    },
    "messages": [
      {
        "id": "uuid",
        "message": "Hello",
        "isFromUser": true,
        "messageType": "text",
        "metadata": {},
        "created_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": "uuid",
        "message": "Xin chào!",
        "isFromUser": false,
        "messageType": "text",
        "metadata": {
          "buttons": [...]
        },
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### **DELETE /chat/sessions/:id**

**Mô tả**: Xóa chat session

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

## 📘 **Facebook API**

### **GET /facebook/pages**

**Mô tả**: Lấy danh sách Facebook pages đã kết nối

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "id": "uuid",
        "pageId": "facebook_page_123",
        "name": "My Business Page",
        "category": "Business",
        "accessToken": "encrypted_token",
        "created_at": "2024-01-01T00:00:00Z",
        "webhook_configured": true,
        "is_active": true
      }
    ]
  }
}
```

---

### **POST /facebook/pages**

**Mô tả**: Kết nối Facebook page mới

**Headers**:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "pageId": "facebook_page_123",
  "accessToken": "page_access_token"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "pageId": "facebook_page_123",
    "name": "My Business Page",
    "category": "Business",
    "webhook_configured": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### **DELETE /facebook/pages/:id**

**Mô tả**: Ngắt kết nối Facebook page

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "message": "Facebook page disconnected successfully"
}
```

---

### **GET /facebook/oauth/callback**

**Mô tả**: OAuth callback endpoint (được gọi từ Facebook)

**Query Parameters**:
```
?code=auth_code&state=csrf_token
```

**Response**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Facebook Connection Success</title>
</head>
<body>
  <script>
    // Post message to parent window
    window.opener.postMessage({
      type: 'FACEBOOK_OAUTH_SUCCESS',
      data: { pages: [...] }
    }, '*');
    window.close();
  </script>
</body>
</html>
```

---

### **POST /facebook/webhook**

**Mô tả**: Webhook để nhận messages từ Facebook

**Headers**:
```http
X-Hub-Signature-256: sha256=signature
```

**Request Body**:
```json
{
  "object": "page",
  "entry": [
    {
      "id": "page_id",
      "time": 1234567890,
      "messaging": [
        {
          "sender": { "id": "user_id" },
          "recipient": { "id": "page_id" },
          "timestamp": 1234567890,
          "message": {
            "mid": "message_id",
            "text": "Hello"
          }
        }
      ]
    }
  ]
}
```

**Response**:
```json
{
  "success": true
}
```

---

### **GET /facebook/webhook**

**Mô tả**: Webhook verification (Facebook setup)

**Query Parameters**:
```
?hub.mode=subscribe&hub.challenge=challenge_string&hub.verify_token=verify_token
```

**Response**:
```
challenge_string
```

---

## 👤 **User API**

### **GET /users/me**

**Mô tả**: Lấy thông tin user hiện tại (alias cho /auth/profile)

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z",
    "settings": {
      "notifications": true,
      "language": "vi",
      "timezone": "Asia/Ho_Chi_Minh"
    }
  }
}
```

---

### **PUT /users/settings**

**Mô tả**: Cập nhật user settings

**Headers**:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "notifications": false,
  "language": "en",
  "timezone": "UTC"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "settings": {
      "notifications": false,
      "language": "en",
      "timezone": "UTC"
    }
  }
}
```

---

## 🔍 **Health Check API**

### **GET /health**

**Mô tả**: Basic health check

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "uptime": 3600,
    "version": "1.0.0"
  }
}
```

---

### **GET /health/db**

**Mô tả**: Database connectivity check

**Response**:
```json
{
  "success": true,
  "data": {
    "database": "connected",
    "response_time": 15,
    "connections": {
      "active": 5,
      "idle": 3,
      "total": 8
    }
  }
}
```

---

### **GET /health/facebook**

**Mô tả**: Facebook API connectivity check

**Response**:
```json
{
  "success": true,
  "data": {
    "facebook_api": "connected",
    "response_time": 250,
    "rate_limit": {
      "remaining": 195,
      "reset_time": "2024-01-01T01:00:00Z"
    }
  }
}
```

---

## ⚠️ **Error Handling**

### **Standard Error Response**
```json
{
  "success": false,
  "error": "Error message",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### **HTTP Status Codes**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `422` - Unprocessable Entity (business logic error)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

### **Error Codes**
```typescript
enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  FACEBOOK_API_ERROR = 'FACEBOOK_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}
```

---

## 📊 **Rate Limiting**

### **Rate Limits**
- **Authentication**: 10 requests/minute
- **Workflow Operations**: 100 requests/minute
- **Chat Processing**: 200 requests/minute
- **Facebook Webhook**: 1000 requests/minute

### **Rate Limit Headers**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

## 🧪 **Testing APIs**

### **Postman Collection**
```json
{
  "info": {
    "name": "Chatbot Workflow API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": {
      "token": "{{access_token}}"
    }
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3001/api"
    }
  ]
}
```

### **cURL Examples**

**Register User**:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Create Workflow**:
```bash
curl -X POST http://localhost:3001/api/workflows \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "nodes": [...],
    "edges": [...]
  }'
```

**Send Chat Message**:
```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "facebookUserId": "user123"
  }'
```

---

## 📝 **API Client SDK**

### **TypeScript SDK Example**
```typescript
class ChatbotApiClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  async createWorkflow(workflow: CreateWorkflowDto) {
    const response = await fetch(`${this.baseUrl}/workflows`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflow)
    });
    
    return await response.json();
  }

  async sendMessage(message: string, facebookUserId: string) {
    const response = await fetch(`${this.baseUrl}/chat/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, facebookUserId })
    });
    
    return await response.json();
  }
}
```

---

## 📋 **API Versioning**

### **Version Strategy**
- **Current Version**: v1
- **URL Pattern**: `/api/v1/...` (future versions)
- **Header Pattern**: `Accept: application/vnd.api+json;version=1`

### **Backward Compatibility**
- Maintain compatibility cho 2 major versions
- Deprecation notices 6 months trước khi remove
- Migration guides cho breaking changes

---

## 🔧 **Environment Configuration**

### **Development**
```env
API_BASE_URL=http://localhost:3001/api
JWT_SECRET=dev-secret-key
RATE_LIMIT_ENABLED=false
DEBUG_MODE=true
```

### **Production**
```env
API_BASE_URL=https://api.chatbot.com/api
JWT_SECRET=secure-production-secret
RATE_LIMIT_ENABLED=true
DEBUG_MODE=false
SSL_REQUIRED=true
``` 