# Sơ Đồ Thiết Kế Hệ Thống - Chatbot Workflow Platform

## Kiến Trúc Tổng Thể

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Frontend]
        B[Facebook Messenger]
        C[Webhook Integrations]
    end
    
    subgraph "API Gateway"
        D[Load Balancer]
        E[Rate Limiting]
        F[SSL Termination]
    end
    
    subgraph "Application Layer"
        G[NestJS Backend]
        H[Auth Service]
        I[Workflow Engine]
        J[Chat Service]
        K[XState Machine]
    end
    
    subgraph "Data Layer"
        L[PostgreSQL]
        M[Redis Cache]
        N[File Storage]
    end
    
    subgraph "External Services"
        O[Facebook Graph API]
        P[N8N Workflows]
        Q[Monitoring Services]
    end
    
    A --> D
    B --> D
    C --> D
    D --> G
    G --> H
    G --> I
    G --> J
    I --> K
    J --> K
    G --> L
    G --> M
    G --> N
    B --> O
    G --> P
    G --> Q
```

## Component Architecture

```mermaid
C4Component
    title Component Diagram - Chatbot Workflow System
    
    Container_Boundary(c1, "NestJS Application") {
        Component(auth, "Auth Module", "NestJS", "Handles user authentication and authorization")
        Component(workflow, "Workflow Module", "NestJS", "Manages workflow CRUD operations")
        Component(chat, "Chat Module", "NestJS", "Processes chat messages and executes workflows")
        Component(xstate, "XState Engine", "XState", "State machine for workflow execution")
        Component(entities, "Data Entities", "TypeORM", "Database entity definitions")
    }
    
    Container_Boundary(c2, "Database Layer") {
        Component(postgres, "PostgreSQL", "Database", "Primary data storage")
        Component(redis, "Redis", "Cache", "Session and temporary data")
    }
    
    Container_Boundary(c3, "External Systems") {
        Component(facebook, "Facebook API", "REST API", "Messenger platform integration")
        Component(n8n, "N8N", "Workflow", "External workflow automation")
    }
    
    Rel(auth, entities, "Uses")
    Rel(workflow, entities, "Uses")
    Rel(chat, entities, "Uses")
    Rel(chat, xstate, "Controls")
    Rel(workflow, xstate, "Configures")
    Rel(entities, postgres, "Persists to")
    Rel(chat, redis, "Caches in")
    Rel(chat, facebook, "Integrates with")
    Rel(workflow, n8n, "Triggers")
```

## Request Flow Architecture

```mermaid
sequenceDiagram
    participant FBU as Facebook User
    participant FB as Facebook Messenger
    participant LB as Load Balancer
    participant API as NestJS API
    participant XS as XState Engine
    participant DB as PostgreSQL
    participant Cache as Redis

    FBU->>FB: Send message
    FB->>LB: Webhook POST /chat/webhook
    LB->>API: Route request
    
    Note over API: Message Processing Pipeline
    API->>DB: Find/Create session
    API->>Cache: Check session cache
    API->>DB: Load workflow configuration
    API->>XS: Create/Get state machine instance
    API->>XS: Send USER_MESSAGE event
    
    Note over XS: State Machine Processing
    XS->>XS: WAITING → PROCESSING
    XS->>XS: Find next node
    XS->>XS: PROCESSING → RESPONDING
    XS->>API: Return bot response
    
    API->>DB: Save conversation
    API->>Cache: Update session state
    API->>FB: Send response
    FB->>FBU: Deliver message
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Frontend Tier"
            A[React App]
            B[CDN/Static Files]
        end
        
        subgraph "Application Tier"
            C[Load Balancer]
            D[NestJS Instance 1]
            E[NestJS Instance 2]
            F[NestJS Instance N]
        end
        
        subgraph "Data Tier"
            G[PostgreSQL Primary]
            H[PostgreSQL Replica]
            I[Redis Cluster]
        end
        
        subgraph "Monitoring"
            J[Log Aggregation]
            K[Metrics Collection]
            L[Health Checks]
        end
    end
    
    subgraph "Development Environment"
        M[Local Development]
        N[Docker Compose]
    end
    
    A --> C
    C --> D
    C --> E
    C --> F
    D --> G
    E --> G
    F --> G
    G --> H
    D --> I
    E --> I
    F --> I
    
    D --> J
    E --> J
    F --> J
    D --> K
    E --> K
    F --> K
```

## Module Interaction Diagram

```mermaid
graph LR
    subgraph "Core Modules"
        A[App Module]
        B[Auth Module]
        C[Workflow Module]
        D[Chat Module]
    end
    
    subgraph "Shared Services"
        E[Database Service]
        F[XState Service]
        G[Validation Service]
        H[Logger Service]
    end
    
    subgraph "External Integrations"
        I[Facebook Service]
        J[N8N Service]
        K[File Upload Service]
    end
    
    A --> B
    A --> C
    A --> D
    B --> E
    C --> E
    D --> E
    C --> F
    D --> F
    B --> G
    C --> G
    D --> G
    A --> H
    D --> I
    C --> J
    C --> K
```

## XState Workflow Engine Architecture

```mermaid
stateDiagram-v2
    [*] --> WorkflowMachineService
    
    state WorkflowMachineService {
        [*] --> InstanceManager
        InstanceManager --> CreateInstance
        InstanceManager --> GetInstance
        InstanceManager --> RemoveInstance
        
        state CreateInstance {
            [*] --> LoadWorkflowData
            LoadWorkflowData --> FindStartNode
            FindStartNode --> InitializeContext
            InitializeContext --> CreateMachine
            CreateMachine --> StoreInstance
            StoreInstance --> [*]
        }
        
        state XStateMachine {
            [*] --> waiting
            waiting --> processing : USER_MESSAGE
            processing --> responding : messageMatch
            processing --> unmatched : noMatch
            processing --> ended : workflowComplete
            responding --> waiting : NEXT_NODE
            unmatched --> waiting : default
            ended --> [*]
        }
    }
```

## Data Flow Architecture

```mermaid
flowchart TD
    A[User Input] --> B{Message Type}
    B -->|Text| C[Process Text Message]
    B -->|Button| D[Process Button Click]
    B -->|Quick Reply| E[Process Quick Reply]
    
    C --> F[Message Matching Algorithm]
    D --> F
    E --> F
    
    F --> G{Match Found?}
    G -->|Yes| H[Load Target Node]
    G -->|No| I[Use Default Response]
    
    H --> J[Generate Response]
    I --> J
    
    J --> K{Response Type}
    K -->|Text| L[Simple Text Response]
    K -->|Buttons| M[Button Template]
    K -->|Quick Replies| N[Quick Reply Template]
    K -->|Cards| O[Generic Template]
    
    L --> P[Send to Facebook]
    M --> P
    N --> P
    O --> P
    
    P --> Q[Update Session State]
    Q --> R[Save to Database]
```

## Security Architecture

```mermaid
graph TB
    subgraph "Client Security"
        A[HTTPS/SSL]
        B[CORS Policy]
        C[Input Validation]
    end
    
    subgraph "API Security"
        D[JWT Authentication]
        E[Rate Limiting]
        F[Request Validation]
        G[Sanitization]
    end
    
    subgraph "Data Security"
        H[Password Hashing]
        I[Database Encryption]
        J[Secure Sessions]
        K[Data Anonymization]
    end
    
    subgraph "Infrastructure Security"
        L[Network Isolation]
        M[Firewall Rules]
        N[VPN Access]
        O[Audit Logging]
    end
    
    A --> D
    B --> E
    C --> F
    F --> G
    D --> H
    E --> I
    F --> J
    G --> K
```

## Scaling Strategy

```mermaid
graph TB
    subgraph "Current State"
        A[Single Instance]
        B[Shared Database]
        C[Local Storage]
    end
    
    subgraph "Phase 1: Vertical Scaling"
        D[Larger Instance]
        E[Connection Pooling]
        F[Query Optimization]
    end
    
    subgraph "Phase 2: Horizontal Scaling"
        G[Load Balancer]
        H[Multiple App Instances]
        I[Database Replication]
        J[Redis Caching]
    end
    
    subgraph "Phase 3: Microservices"
        K[Auth Service]
        L[Workflow Service]
        M[Chat Service]
        N[Message Queue]
    end
    
    subgraph "Phase 4: Cloud Native"
        O[Container Orchestration]
        P[Auto Scaling]
        Q[Service Mesh]
        R[Distributed Tracing]
    end
    
    A --> D
    D --> G
    G --> K
    K --> O
```

## Monitoring Architecture

```mermaid
graph LR
    subgraph "Application Metrics"
        A[Response Time]
        B[Error Rate]
        C[Throughput]
        D[Active Users]
    end
    
    subgraph "Infrastructure Metrics"
        E[CPU Usage]
        F[Memory Usage]
        G[Disk I/O]
        H[Network Traffic]
    end
    
    subgraph "Business Metrics"
        I[Message Volume]
        J[Workflow Completion]
        K[User Engagement]
        L[Conversion Rate]
    end
    
    subgraph "Monitoring Stack"
        M[Prometheus]
        N[Grafana]
        O[AlertManager]
        P[Log Aggregation]
    end
    
    A --> M
    B --> M
    C --> M
    D --> M
    E --> M
    F --> M
    G --> M
    H --> M
    I --> M
    J --> M
    K --> M
    L --> M
    
    M --> N
    M --> O
    M --> P
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Request Received] --> B{Validation Pass?}
    B -->|No| C[400 Bad Request]
    B -->|Yes| D{Authentication Valid?}
    D -->|No| E[401 Unauthorized]
    D -->|Yes| F{Authorization Pass?}
    F -->|No| G[403 Forbidden]
    F -->|Yes| H[Process Request]
    
    H --> I{Processing Error?}
    I -->|Database Error| J[500 Internal Server Error]
    I -->|XState Error| K[Custom Workflow Error]
    I -->|External API Error| L[502 Bad Gateway]
    I -->|Success| M[200 Success Response]
    
    C --> N[Log Error]
    E --> N
    G --> N
    J --> N
    K --> N
    L --> N
    
    N --> O[Send Alert]
    N --> P[Return Error Response]
```

## API Design Pattern

```mermaid
graph TB
    subgraph "RESTful API Design"
        A[/api/v1/auth/*]
        B[/api/v1/workflows/*]
        C[/api/v1/chat/*]
        D[/api/v1/users/*]
    end
    
    subgraph "Authentication Endpoints"
        E[POST /auth/login]
        F[POST /auth/register]
        G[POST /auth/refresh]
        H[POST /auth/logout]
    end
    
    subgraph "Workflow Endpoints"
        I[GET /workflows]
        J[POST /workflows]
        K[PUT /workflows/:id]
        L[DELETE /workflows/:id]
        M[POST /workflows/:id/activate]
    end
    
    subgraph "Chat Endpoints"
        N[POST /chat/webhook]
        O[GET /chat/history/:userId]
        P[POST /chat/reset/:sessionId]
        Q[GET /chat/sessions]
    end
    
    A --> E
    A --> F
    A --> G
    A --> H
    B --> I
    B --> J
    B --> K
    B --> L
    B --> M
    C --> N
    C --> O
    C --> P
    C --> Q
``` 