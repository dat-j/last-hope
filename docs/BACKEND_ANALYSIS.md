# Phân Tích Ứng Dụng Backend - Hệ Thống Chatbot Workflow

## Tổng Quan Hệ Thống

Đây là một ứng dụng backend được xây dựng bằng **NestJS** và **TypeScript**, sử dụng **XState** để quản lý workflow chatbot cho Facebook Messenger. Hệ thống cho phép người dùng tạo và quản lý các workflow chatbot với giao diện kéo-thả (drag-and-drop).

### Công Nghệ Sử Dụng

- **Framework**: NestJS v11.0.1
- **Database**: PostgreSQL với TypeORM v0.3.24
- **State Management**: XState v5.19.3
- **Authentication**: JWT với Passport
- **Validation**: Class-validator & Class-transformer
- **Security**: bcrypt cho mã hóa password

## Kiến Trúc Hệ Thống

### 1. Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │   Frontend      │    │  Facebook       │                 │
│  │   (React)       │    │  Messenger      │                 │
│  └─────────────────┘    └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              NestJS Backend                             ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      ││
│  │  │    Auth     │ │  Workflow   │ │    Chat     │      ││
│  │  │   Module    │ │   Module    │ │   Module    │      ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            │
                            │ TypeORM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                PostgreSQL Database                      ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      ││
│  │  │  Users  │ │Workflows│ │Sessions │ │Messages │      ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2. Cấu Trúc Module

```
backend/src/
├── app.module.ts              # Module chính, cấu hình TypeORM và các module con
├── main.ts                    # Entry point của ứng dụng
├── entities/                  # Định nghĩa các entity cho database
│   ├── user.entity.ts         # Entity User
│   ├── workflow.entity.ts     # Entity Workflow (chứa nodes và edges)
│   ├── chat-session.entity.ts # Entity ChatSession  
│   └── chat-message.entity.ts # Entity ChatMessage
├── auth/                      # Module xác thực
│   ├── auth.module.ts
│   ├── auth.service.ts        # Service xử lý đăng ký/đăng nhập
│   ├── auth.controller.ts     # Controller cho API auth
│   └── jwt-auth.guard.ts      # Guard JWT cho bảo mật
├── workflow/                  # Module quản lý workflow
│   ├── workflow.module.ts
│   ├── workflow.service.ts    # Service CRUD workflow
│   ├── workflow.controller.ts # Controller API workflow
│   ├── workflow.machine.ts    # XState machine logic
│   └── dto/                   # Data Transfer Objects
├── chat/                      # Module xử lý chat
│   ├── chat.module.ts
│   ├── chat.service.ts        # Service xử lý message và workflow execution
│   ├── chat.controller.ts     # Controller API chat
│   └── dto/                   # Data Transfer Objects
└── utils/                     # Các utility functions
```

## Thiết Kế Database

### ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│     USERS       │
├─────────────────┤
│ id (UUID, PK)   │
│ email (UNIQUE)  │
│ name            │
│ password_hash   │
│ created_at      │
│ updated_at      │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│   WORKFLOWS     │
├─────────────────┤
│ id (UUID, PK)   │
│ user_id (FK)    │
│ name            │
│ description     │
│ nodes (JSONB)   │
│ edges (JSONB)   │
│ settings (JSONB)│
│ is_active       │
│ created_at      │
│ updated_at      │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│  CHAT_SESSIONS  │
├─────────────────┤
│ id (UUID, PK)   │
│ workflow_id(FK) │
│ facebook_user_id│
│ current_state   │
│ context (JSONB) │
│ created_at      │
│ updated_at      │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│  CHAT_MESSAGES  │
├─────────────────┤
│ id (UUID, PK)   │
│ session_id (FK) │
│ facebook_user_id│
│ message_text    │
│ message_type    │
│ is_from_user    │
│ metadata (JSONB)│
│ created_at      │
└─────────────────┘
```

### Mô Tả Chi Tiết Các Bảng

#### 1. USERS
- **Mục đích**: Lưu trữ thông tin người dùng của hệ thống quản lý workflow
- **Khóa chính**: `id` (UUID)
- **Quan hệ**: 1 user có nhiều workflows

#### 2. WORKFLOWS
- **Mục đích**: Lưu trữ cấu hình workflow chatbot
- **Khóa chính**: `id` (UUID)
- **Khóa ngoại**: `user_id` → users(id)
- **Đặc điểm**:
  - `nodes`: JSONB lưu trữ cấu trúc nodes của workflow
  - `edges`: JSONB lưu trữ các connection giữa nodes
  - `settings`: JSONB lưu các cài đặt bổ sung

#### 3. CHAT_SESSIONS
- **Mục đích**: Quản lý phiên chat giữa Facebook user và workflow
- **Khóa chính**: `id` (UUID)
- **Khóa ngoại**: `workflow_id` → workflows(id)
- **Đặc điểm**:
  - `facebook_user_id`: ID của user trên Facebook Messenger
  - `current_state`: Trạng thái hiện tại trong workflow (node ID)
  - `context`: JSONB lưu context của XState machine

#### 4. CHAT_MESSAGES
- **Mục đích**: Lưu trữ tất cả tin nhắn trong conversation
- **Khóa chính**: `id` (UUID)
- **Khóa ngoại**: `session_id` → chat_sessions(id)
- **Đặc điểm**:
  - `message_type`: 'text', 'button', 'quick_reply'
  - `is_from_user`: Boolean phân biệt tin nhắn từ user hay bot
  - `metadata`: JSONB lưu thông tin bổ sung (button payload, etc.)

## XState Workflow Engine

### 1. Kiến Trúc XState Machine

```
┌─────────────────────────────────────────────────────────────┐
│                  XState Machine Lifecycle                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐    USER_MESSAGE    ┌─────────────┐
│   WAITING   │ ──────────────────→ │ PROCESSING  │
│             │                    │             │
└─────────────┘                    └─────────────┘
      ▲                                    │
      │                                    │
      │ NEXT_NODE                          │ (guard conditions)
      │                                    ▼
┌─────────────┐                    ┌─────────────┐
│  RESPONDING │                    │  UNMATCHED  │
│             │                    │             │
└─────────────┘                    └─────────────┘
      ▲                                    │
      │                                    │
      └────────────────────────────────────┘
                 TARGET: WAITING
```

### 2. Workflow Context Structure

```typescript
interface WorkflowContext {
  currentNodeId: string;           // Node hiện tại trong workflow
  userMessage: string;             // Tin nhắn từ user
  botResponse: string;             // Phản hồi từ bot
  variables: Record<string, any>;  // Biến lưu trữ trong workflow
  facebookUserId: string;          // ID Facebook user
  conversationHistory: Array<{     // Lịch sử conversation
    message: string;
    isFromUser: boolean;
    timestamp: Date;
  }>;
  messageMatchedWorkflow: boolean; // Tin nhắn có match với workflow không
}
```

### 3. Message Matching Algorithm

Hệ thống sử dụng thuật toán phức tạp để match tin nhắn user với workflow:

```
1. KIỂM TRA NODE HIỆN TẠI
   ├── Buttons trong current node
   ├── Quick replies trong current node  
   └── Elements system (buttons, quick replies trong generic cards)

2. FALLBACK: KIỂM TRA TẤT CẢ NODES
   ├── Tìm kiếm trong tất cả buttons của tất cả nodes
   ├── Tìm kiếm trong tất cả quick replies
   └── Tìm kiếm trong elements system

3. KẾT QUẢ
   ├── Match found: Chuyển đến node đích
   └── No match: Trạng thái UNMATCHED
```

### 4. Node Types và Data Structure

#### A. Legacy Node Structure
```typescript
{
  id: string;
  type: string;
  data: {
    label: string;
    message?: string;
    buttons?: Array<{
      title: string;
      payload: string;
    }>;
    quickReplies?: Array<{
      title: string;
      payload: string;
      imageUrl?: string;
    }>;
  }
}
```

#### B. New Elements System
```typescript
{
  elements?: Array<{
    type: 'text' | 'image' | 'video' | 'button' | 'quick_reply' | 'generic_card';
    content?: string;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    payload?: string;
    url?: string;
    buttons?: Array<{
      type: 'postback' | 'web_url' | 'phone_number';
      title: string;
      payload?: string;
      url?: string;
    }>;
  }>
}
```

## Workflow Processing Flow

### 1. Message Processing Pipeline

```
[Facebook User Message] 
        │
        ▼
[Chat Controller] ──→ [Chat Service.processMessage()]
        │                      │
        │                      ▼
        │              [Find/Create Session]
        │                      │
        │                      ▼
        │              [Load Workflow Data]
        │                      │
        │                      ▼
        │              [Button/QR Detection]
        │                      │
        │                      ▼
        │              [Save User Message]
        │                      │
        │                      ▼
        │              [Get/Create XState Instance]
        │                      │
        │                      ▼
        │              [Send Message to XState]
        │                      │
        │                      ▼
        │              [XState Processing]
        │                      │
        │                      ▼
        │              [Generate Bot Response]
        │                      │
        │                      ▼
        │              [Save Bot Message]
        │                      │
        │                      ▼
        └──────────────[Return ChatResponse]
```

### 2. XState Machine States

#### A. WAITING State
- **Mục đích**: Chờ tin nhắn từ user
- **Triggers**: USER_MESSAGE, RESET
- **Actions**: Lưu user message vào context và conversation history

#### B. PROCESSING State
- **Mục đích**: Xử lý tin nhắn và tìm node tiếp theo
- **Entry Actions**: 
  - Tìm next node dựa trên message matching
  - Cập nhật `messageMatchedWorkflow` flag
- **Guards**: Kiểm tra điều kiện để chuyển state

#### C. RESPONDING State
- **Mục đích**: Tạo phản hồi từ bot
- **Entry Actions**: 
  - Generate bot response từ current node
  - Lưu vào conversation history
- **Triggers**: NEXT_NODE để quay về WAITING

#### D. UNMATCHED State
- **Mục đích**: Xử lý tin nhắn không match với workflow
- **Behavior**: Có thể trả về default message hoặc chuyển về WAITING

#### E. ENDED State
- **Mục đích**: Kết thúc workflow (không có outgoing edges)
- **Behavior**: Workflow hoàn thành

### 3. Session Management

```
WorkflowMachineService
├── machines: Map<sessionId, XStateActor>
├── createWorkflowInstance()    # Tạo instance mới cho session
├── getWorkflowInstance()       # Lấy instance hiện có
├── removeWorkflowInstance()    # Xóa instance
├── sendMessage()              # Gửi message đến machine
└── getCurrentState()          # Lấy state hiện tại
```

## Facebook Messenger Integration

### 1. Message Types Supported

#### A. Text Messages
```typescript
{
  text: string;
  messageType: 'text';
}
```

#### B. Buttons (Postback)
```typescript
{
  attachment: {
    type: 'template',
    payload: {
      template_type: 'button',
      text: string,
      buttons: Array<{
        type: 'postback',
        title: string,
        payload: string
      }>
    }
  }
}
```

#### C. Quick Replies
```typescript
{
  text: string,
  quick_replies: Array<{
    content_type: 'text',
    title: string,
    payload: string,
    image_url?: string
  }>
}
```

#### D. Generic Template (Cards)
```typescript
{
  attachment: {
    type: 'template',
    payload: {
      template_type: 'generic',
      elements: Array<{
        title: string,
        subtitle: string,
        image_url: string,
        buttons: Array<{
          type: 'postback' | 'web_url',
          title: string,
          payload?: string,
          url?: string
        }>
      }>
    }
  }
}
```

### 2. Response Generation

`ChatService.generateMessengerResponse()` method chuyển đổi workflow node data thành Facebook Messenger format, hỗ trợ:

- Backward compatibility với legacy button/quickReply format
- Forward compatibility với elements system
- Automatic format detection và conversion
- Rich media support (images, videos, files)

## Security & Authentication

### 1. JWT Authentication
- **Strategy**: Passport JWT
- **Guards**: JwtAuthGuard bảo vệ các API endpoints
- **Token**: Chứa user ID và email

### 2. Password Security
- **Hashing**: bcrypt với salt rounds
- **Storage**: Chỉ lưu password hash, không lưu plaintext

### 3. API Security
- **Validation**: Class-validator cho input validation
- **Transform**: Class-transformer cho data serialization
- **CORS**: Configured cho frontend integration

## Performance Optimizations

### 1. Database Indexing
```sql
-- Indexes được tạo để tối ưu query performance
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_chat_sessions_workflow_id ON chat_sessions(workflow_id);
CREATE INDEX idx_chat_sessions_facebook_user_id ON chat_sessions(facebook_user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
```

### 2. JSONB Usage
- **Workflows**: Nodes và edges được lưu dưới dạng JSONB cho flexibility
- **Context**: Session context và message metadata dùng JSONB
- **Benefits**: Schema flexibility, built-in JSON operations trong PostgreSQL

### 3. Memory Management
- **XState Instances**: Được lưu trong Map, có thể implement cleanup cho long-running sessions
- **Connection Pooling**: TypeORM automatic connection pooling

## Monitoring & Debugging

### 1. Logging
- **NestJS Logger**: Built-in logging system
- **XState**: State transitions có thể được log
- **Error Handling**: Comprehensive error handling với proper HTTP status codes

### 2. Debugging Tools
- **XState Inspector**: Có thể integrate để visualize state machine
- **Database Queries**: TypeORM query logging
- **Performance Monitoring**: Có thể integrate APM tools

## Kết Luận

Hệ thống được thiết kế với kiến trúc modular, scalable và maintainable:

- **Separation of Concerns**: Rõ ràng giữa auth, workflow management, và chat processing
- **State Management**: XState cung cấp predictable và debuggable workflow execution
- **Data Flexibility**: JSONB cho phép schema evolution mà không cần migration
- **Integration Ready**: Facebook Messenger format support với extensibility cho platforms khác
- **Security**: Comprehensive authentication và input validation
- **Performance**: Database indexing và efficient data structures

Hệ thống có thể dễ dàng mở rộng để hỗ trợ thêm features như:
- Multiple messaging platforms (Telegram, WhatsApp, etc.)
- Advanced workflow nodes (AI integration, external API calls)
- Real-time collaboration
- Analytics và reporting
- A/B testing cho workflows 