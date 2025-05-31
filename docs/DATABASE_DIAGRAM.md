# Sơ Đồ Thiết Kế Database - Hệ Thống Chatbot Workflow

## ERD (Entity Relationship Diagram) - Chi Tiết

```mermaid
erDiagram
    USERS {
        uuid id PK "Primary Key"
        varchar(255) email UK "UNIQUE, NOT NULL"
        varchar(255) name "NOT NULL"
        varchar(255) password_hash "NOT NULL, bcrypt hashed"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "AUTO UPDATE"
    }
    
    WORKFLOWS {
        uuid id PK "Primary Key"
        uuid user_id FK "Foreign Key -> users.id"
        varchar(255) name "NOT NULL"
        text description "NULLABLE"
        jsonb nodes "DEFAULT '[]', Workflow structure"
        jsonb edges "DEFAULT '[]', Node connections"
        jsonb settings "DEFAULT '{}', Configuration"
        boolean is_active "DEFAULT false"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "AUTO UPDATE"
    }
    
    CHAT_SESSIONS {
        uuid id PK "Primary Key"
        uuid workflow_id FK "Foreign Key -> workflows.id"
        varchar(255) facebook_user_id "NOT NULL, Facebook User ID"
        varchar(255) current_state "NULLABLE, Current node ID"
        jsonb context "DEFAULT '{}', XState context"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "AUTO UPDATE"
    }
    
    CHAT_MESSAGES {
        uuid id PK "Primary Key"
        uuid session_id FK "Foreign Key -> chat_sessions.id"
        varchar(255) facebook_user_id "NOT NULL, Facebook User ID"
        text message_text "NULLABLE, Message content"
        varchar(50) message_type "DEFAULT 'text', Message type"
        boolean is_from_user "NOT NULL, Direction flag"
        jsonb metadata "DEFAULT '{}', Extra data"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }
    
    WORKFLOW_NODES {
        uuid id PK "Primary Key"
        uuid workflow_id FK "Foreign Key -> workflows.id"
        varchar(255) node_id "NOT NULL, React Flow node ID"
        varchar(100) node_type "NOT NULL, Node type"
        jsonb content "NOT NULL DEFAULT '{}', Node data"
        jsonb position "NOT NULL DEFAULT '{}', UI position"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "AUTO UPDATE"
    }
    
    WORKFLOW_EDGES {
        uuid id PK "Primary Key"
        uuid workflow_id FK "Foreign Key -> workflows.id"
        varchar(255) edge_id "NOT NULL, React Flow edge ID"
        varchar(255) source_node_id "NOT NULL, Source node"
        varchar(255) target_node_id "NOT NULL, Target node"
        jsonb condition "DEFAULT '{}', Transition condition"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    %% Relationships with cardinality
    USERS ||--o{ WORKFLOWS : "owns (1:N)"
    WORKFLOWS ||--o{ CHAT_SESSIONS : "executes (1:N)"
    WORKFLOWS ||--o{ WORKFLOW_NODES : "contains (1:N)"
    WORKFLOWS ||--o{ WORKFLOW_EDGES : "defines (1:N)"
    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : "stores (1:N)"
```

## Detailed Relationship Visualization

```mermaid
graph TD
    subgraph "USER DOMAIN"
        U[👤 USERS<br/>- id: UUID 🔑<br/>- email: varchar(255) 🔒<br/>- name: varchar(255)<br/>- password_hash: varchar(255)<br/>- created_at/updated_at]
    end
    
    subgraph "WORKFLOW DOMAIN"
        W[⚙️ WORKFLOWS<br/>- id: UUID 🔑<br/>- user_id: UUID 🔗<br/>- name: varchar(255)<br/>- description: text<br/>- nodes: JSONB 📊<br/>- edges: JSONB 🔗<br/>- settings: JSONB ⚙️<br/>- is_active: boolean<br/>- created_at/updated_at]
        
        WN[📦 WORKFLOW_NODES<br/>- id: UUID 🔑<br/>- workflow_id: UUID 🔗<br/>- node_id: varchar(255)<br/>- node_type: varchar(100)<br/>- content: JSONB 📄<br/>- position: JSONB 📍<br/>- created_at/updated_at]
        
        WE[🔗 WORKFLOW_EDGES<br/>- id: UUID 🔑<br/>- workflow_id: UUID 🔗<br/>- edge_id: varchar(255)<br/>- source_node_id: varchar(255)<br/>- target_node_id: varchar(255)<br/>- condition: JSONB ⚡<br/>- created_at]
    end
    
    subgraph "CHAT DOMAIN"
        CS[💬 CHAT_SESSIONS<br/>- id: UUID 🔑<br/>- workflow_id: UUID 🔗<br/>- facebook_user_id: varchar(255)<br/>- current_state: varchar(255)<br/>- context: JSONB 🧠<br/>- created_at/updated_at]
        
        CM[📨 CHAT_MESSAGES<br/>- id: UUID 🔑<br/>- session_id: UUID 🔗<br/>- facebook_user_id: varchar(255)<br/>- message_text: text<br/>- message_type: varchar(50)<br/>- is_from_user: boolean<br/>- metadata: JSONB 📋<br/>- created_at]
    end
    
    %% Relationships with labels
    U -->|"1:N<br/>owns"| W
    W -->|"1:N<br/>contains"| WN
    W -->|"1:N<br/>defines"| WE
    W -->|"1:N<br/>executes"| CS
    CS -->|"1:N<br/>stores"| CM
    
    %% Styling
    classDef userDomain fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef workflowDomain fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef chatDomain fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    
    class U userDomain
    class W,WN,WE workflowDomain
    class CS,CM chatDomain
```

## Foreign Key Constraints & Cascading

```mermaid
graph LR
    subgraph "CASCADE BEHAVIOR"
        A[🗑️ DELETE USER]
        B[🗑️ DELETE WORKFLOW]
        C[🗑️ DELETE SESSION]
        
        A --> |CASCADE| A1[Delete all WORKFLOWS]
        A1 --> |CASCADE| A2[Delete all WORKFLOW_NODES]
        A1 --> |CASCADE| A3[Delete all WORKFLOW_EDGES]
        A1 --> |CASCADE| A4[Delete all CHAT_SESSIONS]
        A4 --> |CASCADE| A5[Delete all CHAT_MESSAGES]
        
        B --> |CASCADE| B1[Delete all WORKFLOW_NODES]
        B --> |CASCADE| B2[Delete all WORKFLOW_EDGES]
        B --> |CASCADE| B3[Delete all CHAT_SESSIONS]
        B3 --> |CASCADE| B4[Delete all CHAT_MESSAGES]
        
        C --> |CASCADE| C1[Delete all CHAT_MESSAGES]
    end
    
    style A fill:#ffebee,stroke:#c62828
    style B fill:#fff3e0,stroke:#e65100
    style C fill:#f1f8e9,stroke:#33691e
```

## Index Strategy Visualization

```mermaid
graph TB
    subgraph "🚀 PERFORMANCE INDEXES"
        I1[📇 idx_workflows_user_id<br/>ON workflows(user_id)<br/>🎯 Find user's workflows]
        I2[📇 idx_chat_sessions_workflow_id<br/>ON chat_sessions(workflow_id)<br/>🎯 Find workflow sessions]
        I3[📇 idx_chat_sessions_facebook_user_id<br/>ON chat_sessions(facebook_user_id)<br/>🎯 Find user sessions]
        I4[📇 idx_chat_messages_session_id<br/>ON chat_messages(session_id)<br/>🎯 Get chat history]
        I5[📇 idx_workflow_nodes_workflow_id<br/>ON workflow_nodes(workflow_id)<br/>🎯 Load workflow structure]
        I6[📇 idx_workflow_edges_workflow_id<br/>ON workflow_edges(workflow_id)<br/>🎯 Load workflow connections]
    end
    
    subgraph "🎯 QUERY PATTERNS"
        Q1[Find workflows by user]
        Q2[Load workflow for execution]
        Q3[Get user's active session]
        Q4[Retrieve chat history]
        Q5[Build workflow graph]
    end
    
    Q1 -.-> I1
    Q2 -.-> I2
    Q2 -.-> I5
    Q2 -.-> I6
    Q3 -.-> I3
    Q4 -.-> I4
    Q5 -.-> I5
    Q5 -.-> I6
```

## JSONB Structure Details

### Workflow Nodes JSONB Schema
```mermaid
graph TD
    subgraph "WORKFLOWS.nodes JSONB"
        WN[📦 WorkflowNode Array]
        WN --> WN1[🆔 id: string]
        WN --> WN2[🏷️ type: string]
        WN --> WN3[📍 position: {x, y}]
        WN --> WN4[📄 data: NodeData]
        
        WN4 --> WD1[🏷️ label: string]
        WN4 --> WD2[💬 message?: string]
        WN4 --> WD3[📋 elements?: Element[]]
        WN4 --> WD4[🔘 buttons?: Button[]]
        WN4 --> WD5[⚡ quickReplies?: QuickReply[]]
        
        WD3 --> E1[📝 text/image/video]
        WD3 --> E2[🔘 button/quick_reply]
        WD3 --> E3[🃏 generic_card]
    end
    
    subgraph "WORKFLOWS.edges JSONB"
        WE[🔗 WorkflowEdge Array]
        WE --> WE1[🆔 id: string]
        WE --> WE2[➡️ source: string]
        WE --> WE3[⬅️ target: string]
        WE --> WE4[🔌 sourceHandle?: string]
        WE --> WE5[🔌 targetHandle?: string]
    end
```

### Chat Context JSONB Schema
```mermaid
graph TD
    subgraph "CHAT_SESSIONS.context JSONB"
        CTX[🧠 XState Context]
        CTX --> CTX1[📍 currentNodeId: string]
        CTX --> CTX2[💬 userMessage: string]
        CTX --> CTX3[🤖 botResponse: string]
        CTX --> CTX4[📊 variables: object]
        CTX --> CTX5[👤 facebookUserId: string]
        CTX --> CTX6[📚 conversationHistory: array]
        CTX --> CTX7[✅ messageMatchedWorkflow: boolean]
    end
    
    subgraph "CHAT_MESSAGES.metadata JSONB"
        META[📋 Message Metadata]
        META --> META1[🔘 buttonPayload?: string]
        META --> META2[🏷️ buttonTitle?: string]
        META --> META3[⚡ quickReplyPayload?: string]
        META --> META4[🏷️ quickReplyTitle?: string]
        META --> META5[📊 nodeId?: string]
        META --> META6[🏷️ nodeType?: string]
    end
```

## Database Size Estimation

```mermaid
pie title "Estimated Storage Distribution (Per 1M Messages)"
    "CHAT_MESSAGES" : 60
    "CHAT_SESSIONS context" : 15
    "WORKFLOWS nodes/edges" : 12
    "WORKFLOW_NODES content" : 8
    "CHAT_MESSAGES metadata" : 3
    "Other tables" : 2
```

## Query Performance Metrics

```mermaid
gantt
    title Database Query Performance (Average Response Time)
    dateFormat X
    axisFormat %s ms
    
    section Read Queries
    Get User Workflows    :1, 5
    Load Workflow Structure :2, 8
    Find User Session     :1, 3
    Get Chat History      :5, 15
    Load Node Content     :3, 7
    
    section Write Queries
    Save Message          :8, 12
    Create Session        :10, 15
    Update Session State  :5, 8
    Create Workflow       :15, 25
    
    section Complex Queries
    Workflow Execution    :20, 35
    Message Matching      :12, 20
    Context Update        :8, 15
```

## Database Schema Evolution

```mermaid
timeline
    title Database Schema Evolution
    
    section V1.0 - Basic Structure
        Users Table : User authentication
        Workflows Table : Basic workflow storage
        Chat Sessions : Session management
        Chat Messages : Message history
    
    section V1.1 - Performance Optimization
        Database Indexes : Added performance indexes
        JSONB Optimization : Optimized JSON queries
    
    section V1.2 - Enhanced Workflow
        Workflow Nodes : Dedicated node table
        Workflow Edges : Dedicated edge table
        Elements System : New flexible element structure
    
    section V2.0 - Future Enhancements
        Analytics Tables : Performance metrics
        Template Library : Reusable components
        Multi-Platform : Support for multiple platforms
```

## Data Flow Trong Database

```mermaid
sequenceDiagram
    participant U as User
    participant W as Workflows
    participant CS as Chat_Sessions
    participant CM as Chat_Messages
    participant WN as Workflow_Nodes
    participant WE as Workflow_Edges

    Note over U,WE: User tạo workflow mới
    U->>W: Create workflow
    W->>WN: Store workflow nodes
    W->>WE: Store workflow edges
    
    Note over U,WE: Facebook user chat với bot
    CS->>W: Load workflow configuration
    W->>WN: Get current node data
    W->>WE: Get possible transitions
    CS->>CM: Save user message
    CS->>CM: Save bot response
    CS->>CS: Update current state
```

## Storage Optimization

```mermaid
pie title "Database Storage Distribution"
    "Chat Messages" : 45
    "Workflow Nodes (JSONB)" : 25
    "Session Context" : 15
    "User Data" : 10
    "Workflow Edges" : 5
```

## Query Performance Analysis

```mermaid
graph TD
    A[Database Query Types] --> B[Read Operations - 70%]
    A --> C[Write Operations - 25%]
    A --> D[Update Operations - 5%]
    
    B --> E[Get Chat History]
    B --> F[Load Workflow Data]
    B --> G[Session Lookup]
    
    C --> H[Save Messages]
    C --> I[Create Sessions]
    C --> J[Store Workflows]
    
    D --> K[Update Session State]
    D --> L[Modify Workflow]
    
    style B fill:#e1f5fe
    style C fill:#f3e5f5
    style D fill:#fff3e0
```

## Backup và Recovery Strategy

```mermaid
graph LR
    subgraph "Backup Strategy"
        A[Daily Full Backup]
        B[Hourly Incremental]
        C[Real-time WAL]
        D[Cross-Region Replica]
    end
    
    subgraph "Recovery Points"
        E[Point-in-Time Recovery]
        F[Automated Failover]
        G[Manual Recovery]
    end
    
    A --> E
    B --> E
    C --> F
    D --> F
    D --> G
```

## Database Scaling Plan

```mermaid
graph TB
    subgraph "Current Architecture"
        A[Single PostgreSQL Instance]
        A --> B[Local Storage]
        A --> C[Manual Backups]
    end
    
    subgraph "Phase 1: Optimization"
        D[Connection Pooling]
        E[Query Optimization]
        F[Index Tuning]
    end
    
    subgraph "Phase 2: Replication"
        G[Master-Slave Setup]
        H[Read Replicas]
        I[Load Balancing]
    end
    
    subgraph "Phase 3: Sharding"
        J[Horizontal Partitioning]
        K[Multi-Region]
        L[Auto-Scaling]
    end
    
    A --> D
    D --> G
    G --> J
``` 