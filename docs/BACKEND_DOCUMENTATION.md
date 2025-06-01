# Backend Documentation - Chatbot Workflow Platform

## 📋 **Tổng quan hệ thống**

Hệ thống backend được xây dựng trên **NestJS** với TypeScript, sử dụng **PostgreSQL** làm database chính và **XState** để quản lý workflow chatbot.

### **Công nghệ chính:**
- **Framework**: NestJS (Node.js + TypeScript)  
- **Database**: PostgreSQL với TypeORM
- **State Management**: XState cho workflow engine
- **Authentication**: JWT với Passport
- **Social Integration**: Facebook Graph API
- **Validation**: Class-validator + Class-transformer

---

## 🏗️ **Kiến trúc Backend**

### **Cấu trúc thư mục:**
```
backend/
├── src/
│   ├── auth/                 # Authentication & Authorization
│   ├── chat/                 # Chat processing & messaging
│   ├── entities/             # Database entities
│   ├── facebook/             # Facebook integration
│   ├── users/                # User management
│   ├── workflow/             # Workflow management
│   ├── migrations/           # Database migrations
│   ├── config/               # Configuration files
│   └── main.ts              # Application entry point
├── package.json
└── .env                     # Environment variables
```

### **Core Modules:**

#### 1. **Auth Module** (`src/auth/`)
- **JWT-based authentication**
- **User registration & login**
- **Password hashing với bcrypt**
- **Guards và Strategies**

**Files:**
- `auth.controller.ts` - Authentication endpoints
- `auth.service.ts` - Authentication business logic
- `jwt.strategy.ts` - JWT strategy cho Passport
- `dto/` - Data Transfer Objects

#### 2. **Chat Module** (`src/chat/`)
- **Message processing engine**
- **Workflow execution**
- **Chat session management**
- **XState integration**

**Files:**
- `chat.controller.ts` - Chat API endpoints
- `chat.service.ts` - Chat processing logic
- `entities/` - Chat-related entities
- `dto/` - Chat DTOs

#### 3. **Workflow Module** (`src/workflow/`)
- **Workflow CRUD operations**
- **XState machine creation**
- **Node & Edge management**
- **Workflow validation**

**Files:**
- `workflow.controller.ts` - Workflow API
- `workflow.service.ts` - Workflow business logic
- `workflow.machine.ts` - XState machine implementation
- `dto/` - Workflow DTOs

#### 4. **Facebook Module** (`src/facebook/`)
- **OAuth 2.0 integration**
- **Page management**
- **Graph API calls**
- **Webhook handling**

**Files:**
- `facebook.controller.ts` - Facebook API endpoints
- `facebook.service.ts` - Facebook integration logic
- `dto/` - Facebook DTOs

#### 5. **Users Module** (`src/users/`)
- **User profile management**
- **User-related operations**
- **Database interactions**

---

## 💾 **Database Entities**

### **User Entity** (`entities/user.entity.ts`)
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => Workflow, workflow => workflow.user)
  workflows: Workflow[];

  @OneToMany(() => FacebookPage, page => page.user)
  facebookPages: FacebookPage[];
}
```

### **Workflow Entity** (`entities/workflow.entity.ts`)
```typescript
@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  nodes: WorkflowNode[];

  @Column({ type: 'jsonb' })
  edges: WorkflowEdge[];

  @Column({ default: false })
  isActive: boolean;

  @ManyToOne(() => User, user => user.workflows)
  user: User;

  @Column()
  userId: string;
}
```

### **Facebook Page Entity** (`entities/facebook-page.entity.ts`)
```typescript
@Entity('facebook_pages')
export class FacebookPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  pageId: string;

  @Column()
  name: string;

  @Column()
  accessToken: string;

  @Column({ nullable: true })
  category: string;

  @ManyToOne(() => User, user => user.facebookPages)
  user: User;

  @Column()
  userId: string;
}
```

### **Chat Session Entity** (`entities/chat-session.entity.ts`)
```typescript
@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  facebookUserId: string;

  @Column()
  workflowId: string;

  @Column()
  currentState: string;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;

  @ManyToOne(() => Workflow)
  workflow: Workflow;
}
```

---

## 🔄 **XState Workflow Engine**

### **Machine Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow State Machine                   │
├─────────────────────────────────────────────────────────────┤
│  WAITING → PROCESSING → RESPONDING/UNMATCHED/ENDED         │
│     ↑                        ↓                             │
│     └────────────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

### **States:**
1. **WAITING**: Chờ input từ user
2. **PROCESSING**: Xử lý message và tìm next node
3. **RESPONDING**: Gửi response từ workflow
4. **UNMATCHED**: Message không match workflow
5. **ENDED**: Workflow kết thúc

### **Enhanced Matching Logic:**
- **Exact payload matching**: `button.payload === userInput`
- **Title-based matching**: `button.title.includes(input)`
- **Start node keywords**: `['start', 'bắt đầu', 'reset']`
- **Fallback search**: Tìm trong tất cả nodes
- **Smart edge selection**: Map button index với edge index

---

## 🌐 **API Endpoints**

### **Authentication API** (`/auth`)
```typescript
POST   /auth/register          # User registration
POST   /auth/login             # User login
GET    /auth/profile           # Get user profile
PUT    /auth/profile           # Update profile
```

### **Workflow API** (`/workflows`)
```typescript
GET    /workflows              # Get all workflows
POST   /workflows              # Create new workflow
GET    /workflows/:id          # Get workflow by ID
PUT    /workflows/:id          # Update workflow
DELETE /workflows/:id          # Delete workflow
POST   /workflows/:id/activate # Activate workflow
GET    /workflows/active       # Get active workflow
PATCH  /workflows/:id/nodes    # Update workflow nodes
PATCH  /workflows/:id/edges    # Update workflow edges
```

### **Chat API** (`/chat`)
```typescript
POST   /chat/message           # Process chat message
GET    /chat/sessions          # Get chat sessions
GET    /chat/sessions/:id      # Get session by ID
DELETE /chat/sessions/:id      # Delete session
```

### **Facebook API** (`/facebook`)
```typescript
GET    /facebook/pages         # Get connected pages
POST   /facebook/pages         # Connect new page
DELETE /facebook/pages/:id     # Disconnect page
GET    /facebook/oauth/callback # OAuth callback
POST   /facebook/webhook       # Facebook webhook
```

---

## 🔧 **Configuration**

### **Environment Variables:**
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=chatbot_db
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3001/facebook/oauth/callback

# App
PORT=3001
NODE_ENV=development
```

### **Database Configuration:**
```typescript
// config/database.config.ts
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
};
```

---

## 🚀 **Workflow Processing Flow**

### **Message Processing Pipeline:**
```
1. Receive user message
   ↓
2. Find/Create chat session
   ↓
3. Get workflow instance (XState)
   ↓
4. Send message to state machine
   ↓
5. Execute matching logic
   ↓
6. Generate response
   ↓
7. Save to database
   ↓
8. Return response to client
```

### **Matching Algorithm:**
```typescript
function findNextNode(currentNodeId, userInput) {
  // 1. Check special keywords (start, reset, etc.)
  if (isStartKeyword(userInput)) {
    return startNode;
  }
  
  // 2. Check current node content
  if (matchesCurrentNode(userInput)) {
    return findTargetFromCurrentNode();
  }
  
  // 3. Fallback: Search all nodes (start node first)
  return searchAllNodes(userInput);
}
```

---

## 📊 **Performance & Monitoring**

### **Logging Strategy:**
- **Debug logs**: Workflow matching process
- **Info logs**: API requests và responses
- **Error logs**: Exceptions và failures
- **Performance logs**: Database query times

### **Error Handling:**
```typescript
// Global exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Log error và return appropriate response
  }
}
```

### **Validation:**
```typescript
// DTO validation với class-validator
export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  nodes: WorkflowNode[];
}
```

---

## 🔐 **Security**

### **Authentication:**
- JWT tokens với secure secret
- Password hashing với bcrypt (salt rounds: 10)
- Route protection với Guards

### **Authorization:**
- User-based resource access
- Workflow ownership validation
- Facebook page ownership verification

### **Data Protection:**
- Input validation và sanitization
- SQL injection prevention (TypeORM)
- XSS protection
- CORS configuration

---

## 🧪 **Testing Strategy**

### **Unit Tests:**
```typescript
// Example: Workflow service test
describe('WorkflowService', () => {
  it('should create workflow successfully', async () => {
    const dto = { name: 'Test Workflow', nodes: [], edges: [] };
    const result = await service.create(dto, 'user-id');
    expect(result.name).toBe('Test Workflow');
  });
});
```

### **Integration Tests:**
- API endpoint testing
- Database integration testing
- XState machine testing

### **E2E Tests:**
- Complete workflow testing
- Facebook integration testing
- Authentication flow testing

---

## 📚 **Development Guidelines**

### **Code Style:**
- ESLint + Prettier configuration
- TypeScript strict mode
- Consistent naming conventions

### **Git Workflow:**
- Feature branches
- Pull request reviews
- Conventional commits

### **Deployment:**
- Docker containerization
- Environment-specific configs
- Database migrations
- Health checks

</rewritten_file> 