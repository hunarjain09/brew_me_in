# Architecture Overview

Comprehensive architectural documentation for brew_me_in, including system design, code flow diagrams, and component interactions.

## Table of Contents

- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Component Architecture](#component-architecture)
- [Database Schema](#database-schema)
- [API Architecture](#api-architecture)
- [Real-time Architecture](#real-time-architecture)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)

## System Architecture

### High-Level Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Mobile[Mobile App<br/>React Native]
        Web[Web App<br/>React]
        Admin[Admin Dashboard<br/>React]
    end

    subgraph "CDN Layer"
        CloudFront[CloudFront CDN<br/>Static Assets]
    end

    subgraph "Load Balancer"
        ALB[Application Load Balancer<br/>SSL Termination]
    end

    subgraph "Application Layer"
        API1[Backend Server 1<br/>Node.js + Express]
        API2[Backend Server 2<br/>Node.js + Express]
        API3[Backend Server N<br/>Node.js + Express]
        Scheduler[Scheduler Agent<br/>Background Jobs]
    end

    subgraph "Real-time Layer"
        Socket1[Socket.io Server 1]
        Socket2[Socket.io Server 2]
        Socket3[Socket.io Server N]
    end

    subgraph "Cache Layer"
        Redis[(Redis Cluster<br/>Session + Rate Limiting)]
        RedisPubSub[Redis Pub/Sub<br/>WebSocket Events]
    end

    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL<br/>Primary Database)]
        ReadReplica[(Read Replica<br/>Analytics)]
    end

    subgraph "External Services"
        Anthropic[Anthropic API<br/>Claude AI]
        Monitoring[Monitoring<br/>Sentry + DataDog]
        Logs[Log Aggregation<br/>CloudWatch]
    end

    Mobile --> CloudFront
    Web --> CloudFront
    Admin --> CloudFront

    Mobile --> ALB
    Web --> ALB
    Admin --> ALB

    ALB --> API1
    ALB --> API2
    ALB --> API3

    API1 -.WebSocket.-> Socket1
    API2 -.WebSocket.-> Socket2
    API3 -.WebSocket.-> Socket3

    API1 --> Redis
    API2 --> Redis
    API3 --> Redis
    Scheduler --> Redis

    Socket1 --> RedisPubSub
    Socket2 --> RedisPubSub
    Socket3 --> RedisPubSub

    API1 --> PostgreSQL
    API2 --> PostgreSQL
    API3 --> PostgreSQL
    Scheduler --> PostgreSQL

    API1 -.reads.-> ReadReplica
    API2 -.reads.-> ReadReplica
    API3 -.reads.-> ReadReplica

    API1 --> Anthropic
    API2 --> Anthropic
    API3 --> Anthropic

    API1 --> Monitoring
    API2 --> Monitoring
    API3 --> Monitoring

    API1 --> Logs
    API2 --> Logs
    API3 --> Logs
```

### Layered Architecture

```mermaid
graph TD
    subgraph "Presentation Layer"
        A[API Routes<br/>REST + WebSocket]
    end

    subgraph "Security Layer"
        B[Middleware Stack]
        B1[CORS + Helmet]
        B2[Rate Limiting]
        B3[JWT Authentication]
        B4[Input Validation]
        B --> B1
        B --> B2
        B --> B3
        B --> B4
    end

    subgraph "Business Logic Layer"
        C[Controllers]
        D[Services]
        E[Models]
        C --> D
        D --> E
    end

    subgraph "Data Access Layer"
        F[Database Client<br/>PostgreSQL]
        G[Cache Client<br/>Redis]
        H[External APIs<br/>Anthropic]
    end

    subgraph "Infrastructure Layer"
        I[Logger<br/>Winston]
        J[Job Scheduler<br/>node-cron]
        K[WebSocket<br/>Socket.io]
    end

    A --> B
    B --> C
    E --> F
    E --> G
    D --> H
    C -.uses.-> I
    D -.uses.-> I
    J --> D
    K --> D
```

## Technology Stack

### Backend Stack

```mermaid
graph LR
    subgraph "Runtime"
        Node[Node.js 18+<br/>TypeScript 5.3]
    end

    subgraph "Framework"
        Express[Express.js 4.18<br/>REST API]
        SocketIO[Socket.io 4.7<br/>WebSockets]
    end

    subgraph "Data Stores"
        PostgreSQL[(PostgreSQL 14+<br/>ACID Database)]
        Redis[(Redis 7+<br/>Cache + Pub/Sub)]
    end

    subgraph "AI/ML"
        Anthropic[Anthropic SDK<br/>Claude Sonnet 4.5]
    end

    subgraph "Testing"
        Jest[Jest 29<br/>Test Runner]
        Supertest[Supertest<br/>API Testing]
        MSW[MSW<br/>API Mocking]
    end

    Node --> Express
    Node --> SocketIO
    Express --> PostgreSQL
    Express --> Redis
    SocketIO --> Redis
    Express --> Anthropic

    Jest --> Supertest
    Jest --> MSW
```

### Frontend Stack

```mermaid
graph LR
    subgraph "Framework"
        React[React 18<br/>UI Library]
        Vite[Vite 5<br/>Build Tool]
    end

    subgraph "Styling"
        Tailwind[Tailwind CSS 3.4<br/>Utility-First CSS]
    end

    subgraph "State Management"
        Context[React Context<br/>Auth State]
        LocalState[Component State]
    end

    subgraph "Real-time"
        SocketClient[Socket.io Client<br/>WebSocket]
    end

    subgraph "HTTP"
        Axios[Axios<br/>HTTP Client]
    end

    React --> Vite
    React --> Tailwind
    React --> Context
    React --> LocalState
    React --> SocketClient
    React --> Axios
```

## Data Flow Diagrams

### Complete Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant ALB as Load Balancer
    participant API as Backend API
    participant Auth as Auth Middleware
    participant RateLimit as Rate Limiter
    participant Controller
    participant Service
    participant Redis
    participant PostgreSQL
    participant Socket as Socket.io

    Client->>ALB: HTTPS Request
    ALB->>API: Forward Request
    API->>Auth: Verify JWT Token
    Auth->>Redis: Check Token Validity
    Redis-->>Auth: Token Valid
    Auth->>RateLimit: Check Rate Limit
    RateLimit->>Redis: Get Token Count
    Redis-->>RateLimit: Tokens Available
    RateLimit->>Controller: Process Request
    Controller->>Service: Business Logic
    Service->>PostgreSQL: Query Database
    PostgreSQL-->>Service: Data
    Service->>Redis: Cache Result
    Service-->>Controller: Response Data
    Controller-->>API: JSON Response
    API-->>ALB: Response
    ALB-->>Client: HTTPS Response

    Note over Service,Socket: Optional: Real-time Update
    Service->>Socket: Emit Event
    Socket->>Redis: Publish to Pub/Sub
    Redis-->>Socket: Broadcast to Clients
    Socket-->>Client: WebSocket Event
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Barista
    participant Customer
    participant API as Backend API
    participant DB as PostgreSQL
    participant Redis
    participant JWT as JWT Service

    Note over Barista: Step 1: Generate Username
    Barista->>API: POST /auth/barista/generate-username<br/>{cafeId, receiptId}
    API->>DB: Create join_token
    DB-->>API: Token Created
    API-->>Barista: {username, joinToken, expiresAt}
    Barista->>Customer: Share Username + Token<br/>(printed on receipt)

    Note over Customer: Step 2: Join Cafe
    Customer->>API: POST /auth/join<br/>{username, joinToken, cafeId, wifiSsid, gps}
    API->>DB: Validate join_token
    DB-->>API: Token Valid
    API->>API: Validate WiFi/GPS
    API->>DB: Create user (expires in 24h)
    DB-->>API: User Created
    API->>JWT: Generate access + refresh tokens
    JWT-->>API: Tokens
    API->>Redis: Store session + refresh token
    Redis-->>API: Stored
    API-->>Customer: {accessToken, refreshToken, user}

    Note over Customer: Step 3: Use Access Token
    Customer->>API: GET /users/me<br/>Authorization: Bearer {accessToken}
    API->>JWT: Verify Access Token
    JWT-->>API: Valid
    API->>Redis: Get User Session
    Redis-->>API: User Data
    API-->>Customer: {user}

    Note over Customer: Step 4: Refresh Token (after 24h)
    Customer->>API: POST /auth/refresh<br/>{refreshToken}
    API->>Redis: Validate Refresh Token
    Redis-->>API: Valid
    API->>JWT: Generate New Access Token
    JWT-->>API: New Token
    API-->>Customer: {accessToken, user}
```

### Real-time Chat Flow

```mermaid
sequenceDiagram
    participant User1 as User 1
    participant User2 as User 2
    participant Socket1 as Socket.io Server 1
    participant Socket2 as Socket.io Server 2
    participant Redis as Redis Pub/Sub
    participant RateLimit as Rate Limiter
    participant Spam as Spam Detector
    participant DB as PostgreSQL

    Note over User1: Connect to WebSocket
    User1->>Socket1: Connect with JWT
    Socket1->>Socket1: Authenticate JWT
    Socket1->>Redis: Add to cafe room
    Socket1-->>User1: Connected

    User2->>Socket2: Connect with JWT
    Socket2->>Socket2: Authenticate JWT
    Socket2->>Redis: Add to cafe room
    Socket2-->>User2: Connected

    Note over User1: Send Message
    User1->>Socket1: message:send<br/>{cafeId, content}
    Socket1->>RateLimit: Check Rate Limit
    RateLimit->>Redis: Consume Token
    Redis-->>RateLimit: Allowed
    Socket1->>Spam: Check Spam
    Spam->>Redis: Check Last Message
    Redis-->>Spam: Not Spam
    Socket1->>DB: Store Message
    DB-->>Socket1: Message Saved
    Socket1->>Redis: Cache Message
    Socket1->>Redis: Publish to Pub/Sub<br/>channel: cafe:{cafeId}

    Redis-->>Socket1: Broadcast Event
    Redis-->>Socket2: Broadcast Event

    Socket1->>User1: message:new<br/>{message, sender}
    Socket2->>User2: message:new<br/>{message, sender}

    Note over User1: Typing Indicator
    User1->>Socket1: typing:start
    Socket1->>Redis: Publish typing event
    Redis-->>Socket2: Broadcast
    Socket2->>User2: typing:indicator<br/>{userId, username}
```

### Interest Matching & Poke Flow

```mermaid
sequenceDiagram
    participant UserA as User A
    participant UserB as User B
    participant API as Backend API
    participant Matching as Matching Service
    participant Poke as Poke Service
    participant DB as PostgreSQL
    participant Socket as Socket.io
    participant DM as DM Service

    Note over UserA: Step 1: Set Interests
    UserA->>API: POST /matching/interests<br/>{interests: ["coffee", "tech"]}
    API->>DB: Store user_interests
    DB-->>API: Interests Saved
    API-->>UserA: Success

    UserB->>API: POST /matching/interests<br/>{interests: ["coffee", "books"]}
    API->>DB: Store user_interests
    DB-->>API: Interests Saved
    API-->>UserB: Success

    Note over UserA: Step 2: Discover Users
    UserA->>API: GET /matching/discover?cafeId={id}
    API->>Matching: Find Matches
    Matching->>DB: Query users with shared interests
    DB-->>Matching: [UserB, UserC, ...]
    Matching-->>API: Sorted by match score
    API-->>UserA: [{userId: UserB, sharedInterests: ["coffee"]}]

    Note over UserA: Step 3: Send Poke
    UserA->>API: POST /pokes/send<br/>{toUserId: UserB, sharedInterest: "coffee"}
    API->>Poke: Create Poke
    Poke->>DB: INSERT poke (status: pending)
    DB-->>Poke: Poke Created
    Poke->>Socket: Emit poke_received
    Socket-->>UserB: poke_received<br/>{sharedInterest: "coffee"}<br/>(identity hidden)
    API-->>UserA: Poke Sent

    Note over UserB: Step 4: Poke Back (Mutual Match)
    UserB->>API: POST /pokes/send<br/>{toUserId: UserA, sharedInterest: "coffee"}
    API->>Poke: Create Poke
    Poke->>DB: Check existing poke from UserA
    DB-->>Poke: Pending poke exists!
    Poke->>DB: Update both pokes to "matched"
    Poke->>DM: Create DM Channel
    DM->>DB: INSERT dm_channel<br/>{user1: UserA, user2: UserB}
    DB-->>DM: Channel Created
    Poke->>Socket: Emit poke_matched to both
    Socket-->>UserA: poke_matched<br/>{matchedUser: UserB, channelId}
    Socket-->>UserB: poke_matched<br/>{matchedUser: UserA, channelId}
    API-->>UserB: Match Created!

    Note over UserA,UserB: Step 5: Direct Messaging
    UserA->>API: POST /dm/{channelId}/messages<br/>{content: "Hi!"}
    API->>DM: Send DM
    DM->>DB: INSERT dm_message
    DM->>Socket: Emit dm_message
    Socket-->>UserB: dm_message<br/>{from: UserA, content: "Hi!"}
```

### AI Agent Query Flow

```mermaid
sequenceDiagram
    participant User
    participant Socket as Socket.io
    participant Handler as Agent Handler
    participant RateLimit as Rate Limiter
    participant Cache as Redis Cache
    participant Prompt as Prompt Builder
    participant Anthropic as Claude API
    participant DB as PostgreSQL

    Note over User: Step 1: Connect
    User->>Socket: Connect to /agent namespace
    Socket->>Socket: Authenticate JWT
    Socket-->>User: Connected

    User->>Socket: cafe:join {cafeId}
    Socket-->>User: Joined cafe room

    Note over User: Step 2: Send Query
    User->>Socket: query:stream<br/>{query: "What's popular?", cafeId}
    Socket->>RateLimit: Check Rate Limit
    RateLimit->>Cache: Personal + Global limits
    Cache-->>RateLimit: Allowed

    Socket->>Handler: Process Query
    Handler->>Cache: Check Query Cache<br/>Key: agent:cache:{cafeId}:{hash}

    alt Cache Hit
        Cache-->>Handler: Cached Response
        Handler->>Socket: query:complete
        Socket-->>User: Full Response (instant)
    else Cache Miss
        Cache-->>Handler: Not Found

        Handler->>Prompt: Build Context Prompt
        Prompt->>DB: Get cafe stats, popular drinks
        DB-->>Prompt: Context Data
        Prompt-->>Handler: System + User Prompt

        Handler->>Anthropic: Stream Query<br/>model: claude-sonnet-4-5
        Handler->>Socket: query:start
        Socket-->>User: Query Started

        loop Streaming Response
            Anthropic-->>Handler: Chunk
            Handler->>Socket: query:chunk<br/>{text: "..."}
            Socket-->>User: Display Chunk
        end

        Anthropic-->>Handler: Stream Complete
        Handler->>Cache: Store Response (1h TTL)
        Handler->>DB: Log query + response time
        Handler->>Socket: query:complete<br/>{fullResponse}
        Socket-->>User: Query Complete
    end

    Note over Socket: Proactive Messages (Background)
    loop Every 2 Minutes
        Handler->>DB: Get active cafes
        Handler->>RateLimit: Check Global Cooldown
        alt Allowed
            Handler->>Anthropic: Generate Proactive Message
            Anthropic-->>Handler: Message
            Handler->>Socket: Broadcast to cafe room
            Socket-->>User: proactive:message
        end
    end
```

### Background Jobs Flow

```mermaid
graph TB
    subgraph "Scheduler Agent"
        Cron[node-cron Scheduler]
    end

    subgraph "Hourly Jobs"
        ExpireUsers[expireUsers<br/>0 * * * *]
        AggregateAnalytics[aggregateAnalytics<br/>5 * * * *]
    end

    subgraph "Daily Jobs"
        ExpireBadges[expireBadges<br/>0 0 * * *]
        CalculateBadges[calculateBadges<br/>5 0 * * *]
    end

    subgraph "Frequent Jobs"
        ExpirePokes[expirePokes<br/>*/5 * * * *]
        ProactiveMessages[proactiveMessages<br/>*/2 * * * *]
    end

    subgraph "Database Operations"
        DB[(PostgreSQL)]
        Users[users table]
        Badges[badges table]
        Pokes[pokes table]
        Analytics[cafe_analytics table]
    end

    subgraph "Cache Operations"
        Redis[(Redis)]
        CacheInvalidate[Invalidate Cache]
        UpdatePresence[Update Presence]
    end

    Cron --> ExpireUsers
    Cron --> AggregateAnalytics
    Cron --> ExpireBadges
    Cron --> CalculateBadges
    Cron --> ExpirePokes
    Cron --> ProactiveMessages

    ExpireUsers --> Users
    ExpireUsers --> Redis
    Users --> CacheInvalidate

    ExpireBadges --> Badges
    CalculateBadges --> Badges
    CalculateBadges --> Users

    ExpirePokes --> Pokes

    AggregateAnalytics --> Analytics
    AggregateAnalytics --> Users

    ProactiveMessages --> DB
    ProactiveMessages --> UpdatePresence
```

## Component Architecture

### Component Interaction Map

```mermaid
graph TD
    subgraph "Component 1: Auth & Users"
        Auth[Authentication]
        Users[User Management]
        Badges[Badge System]
        Network[Network Validation]
    end

    subgraph "Component 2: Real-time Chat"
        Socket[Socket.io Handler]
        Messages[Message Service]
        Presence[Presence Tracking]
        Topics[Topic Extraction]
    end

    subgraph "Component 3: Rate Limiting"
        RateLimit[Rate Limiter]
        Spam[Spam Detector]
        AutoMod[Auto-Moderation]
    end

    subgraph "Component 4: Matching"
        Matching[Interest Matching]
        Poke[Poke System]
        DM[Direct Messages]
    end

    subgraph "Component 5: AI Agent"
        Claude[Claude Service]
        PromptBuilder[Prompt Builder]
        AgentCache[Query Cache]
    end

    subgraph "Component 8: Background"
        Scheduler[Job Scheduler]
        Jobs[Cron Jobs]
    end

    Auth --> Users
    Users --> Badges
    Auth --> Network

    Socket --> Messages
    Socket --> Presence
    Messages --> Topics

    Socket --> RateLimit
    Messages --> Spam
    Spam --> AutoMod

    Users --> Matching
    Matching --> Poke
    Poke --> DM

    Socket --> Claude
    Claude --> PromptBuilder
    Claude --> AgentCache

    Scheduler --> Jobs
    Jobs --> Users
    Jobs --> Badges
    Jobs --> Poke
    Jobs --> Claude

    RateLimit -.checks.-> Messages
    RateLimit -.checks.-> Claude
    RateLimit -.checks.-> Poke
```

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    CAFES ||--o{ USERS : "has many"
    CAFES ||--o{ MESSAGES : "has many"
    CAFES ||--o{ CAFE_ANALYTICS : "has many"
    CAFES ||--o{ AGENT_CONFIG : "has one"

    USERS ||--o{ MESSAGES : "sends"
    USERS ||--o{ BADGES : "has many"
    USERS ||--o{ TIPS : "gives"
    USERS ||--o{ JOIN_TOKENS : "uses"
    USERS ||--o{ REFRESH_TOKENS : "has"
    USERS ||--o{ USER_INTERESTS : "has many"
    USERS ||--o{ POKES : "sends/receives"
    USERS ||--o{ DM_MESSAGES : "sends"

    POKES ||--o| DM_CHANNELS : "creates"
    DM_CHANNELS ||--o{ DM_MESSAGES : "contains"

    CAFES {
        uuid id PK
        string name
        string address
        string wifi_ssid
        float latitude
        float longitude
        int radius_meters
        timestamp created_at
    }

    USERS {
        uuid id PK
        string username UK
        uuid cafe_id FK
        string badge_status
        boolean poke_enabled
        timestamp created_at
        timestamp expires_at
    }

    BADGES {
        uuid id PK
        uuid user_id FK
        string badge_type
        timestamp awarded_at
        timestamp expires_at
    }

    MESSAGES {
        uuid id PK
        uuid cafe_id FK
        uuid user_id FK
        text content
        timestamp created_at
        boolean deleted
    }

    USER_INTERESTS {
        uuid id PK
        uuid user_id FK
        string interest
        timestamp created_at
    }

    POKES {
        uuid id PK
        uuid from_user_id FK
        uuid to_user_id FK
        string shared_interest
        string status
        timestamp created_at
        timestamp expires_at
    }

    DM_CHANNELS {
        uuid id PK
        uuid user1_id FK
        uuid user2_id FK
        timestamp created_at
        timestamp last_message_at
    }

    DM_MESSAGES {
        uuid id PK
        uuid channel_id FK
        uuid sender_id FK
        text content
        timestamp created_at
        boolean deleted
    }
```

### Redis Data Structure

```mermaid
graph LR
    subgraph "Session Management"
        Session[session:{sessionId}<br/>HASH]
        UserSession[user:{userId}<br/>HASH]
        RefreshToken[user:{userId}:refresh_token<br/>STRING]
    end

    subgraph "Rate Limiting"
        MessageRate[ratelimit:message:{userId}<br/>STRING - token count]
        MessageLast[ratelimit:message:{userId}:last<br/>STRING - timestamp]
        AgentGlobal[ratelimit:agent:global<br/>STRING - timestamp]
        AgentPersonal[ratelimit:agent:{userId}:{sessionId}<br/>STRING - count]
        PokeCount[ratelimit:poke:{userId}:count<br/>STRING - count]
    end

    subgraph "Spam Detection"
        SpamDup[spam:duplicate:{userId}<br/>STRING - last message]
        SpamMute[spam:mute:{userId}<br/>JSON - mute record]
    end

    subgraph "Chat System"
        CafeUsers[cafe:{cafeId}:users<br/>SET - user IDs]
        CafeMessages[cafe:{cafeId}:messages<br/>LIST - last 100 messages]
        CafeTopics[cafe:{cafeId}:topics<br/>ZSET - trending words]
        UserPresence[user:{userId}:presence<br/>HASH - online status]
    end

    subgraph "AI Agent"
        AgentCache[agent:cache:{cafeId}:{hash}<br/>STRING - response]
        AgentAnalytics[agent:analytics:{cafeId}<br/>HASH - stats]
    end
```

## API Architecture

### REST API Endpoints

```mermaid
graph LR
    subgraph "Public Endpoints"
        Health[GET /api/health]
    end

    subgraph "Auth Endpoints"
        BaristaGen[POST /api/auth/barista/generate-username]
        Join[POST /api/auth/join]
        Refresh[POST /api/auth/refresh]
    end

    subgraph "User Endpoints (Protected)"
        GetUser[GET /api/users/me]
        UpdateInterests[PUT /api/users/me/interests]
        TogglePoke[PUT /api/users/me/poke-enabled]
    end

    subgraph "Badge Endpoints (Protected)"
        RecordTip[POST /api/badges/record-tip]
        BadgeStatus[GET /api/badges/status]
    end

    subgraph "Chat Endpoints (Protected)"
        GetMessages[GET /api/chat/messages/:cafeId]
        DeleteMessage[DELETE /api/chat/messages/:id]
        GetPresence[GET /api/chat/presence/:cafeId]
        GetTopics[GET /api/chat/topics/:cafeId]
    end

    subgraph "Matching Endpoints (Protected)"
        Discover[GET /api/matching/discover]
        GetInterests[GET /api/matching/interests]
        SetInterests[POST /api/matching/interests]
        AddInterest[POST /api/matching/interests/add]
        RemoveInterest[POST /api/matching/interests/remove]
    end

    subgraph "Poke Endpoints (Protected)"
        SendPoke[POST /api/pokes/send]
        RespondPoke[POST /api/pokes/respond]
        GetPending[GET /api/pokes/pending]
        GetSent[GET /api/pokes/sent]
    end

    subgraph "DM Endpoints (Protected)"
        GetChannels[GET /api/dm/channels]
        GetDMMessages[GET /api/dm/:channelId/messages]
        SendDM[POST /api/dm/:channelId/messages]
        DeleteDM[DELETE /api/dm/messages/:id]
    end

    subgraph "Rate Limit Endpoints"
        RateLimitStatus[GET /api/v1/ratelimit/status]
        RateLimitCheck[POST /api/v1/ratelimit/check]
        SpamCheck[POST /api/v1/spam/check]
        GetMute[GET /api/v1/spam/mute/:userId]
        Unmute[DELETE /api/v1/spam/mute/:userId]
        ResetLimit[POST /api/v1/ratelimit/reset]
    end
```

### WebSocket Namespaces

```mermaid
graph TB
    subgraph "Default Namespace (/)"
        Connect[connect]
        JoinCafe[join:cafe]
        LeaveCafe[leave:cafe]
        SendMessage[message:send]
        TypingStart[typing:start]
        PresenceUpdate[presence:update]

        NewMessage[message:new]
        UsersUpdate[users:update]
        TypingIndicator[typing:indicator]
        TopicsUpdate[topics:update]
    end

    subgraph "Agent Namespace (/agent)"
        AgentConnect[connect]
        AgentJoin[cafe:join]
        AgentLeave[cafe:leave]
        QueryStream[query:stream]

        QueryStart[query:start]
        QueryChunk[query:chunk]
        QueryComplete[query:complete]
        QueryError[query:error]
        ProactiveMsg[proactive:message]
    end

    Connect --> JoinCafe
    JoinCafe --> SendMessage
    SendMessage --> NewMessage
    SendMessage --> UsersUpdate

    SendMessage --> TypingStart
    TypingStart --> TypingIndicator

    AgentConnect --> AgentJoin
    AgentJoin --> QueryStream
    QueryStream --> QueryStart
    QueryStart --> QueryChunk
    QueryChunk --> QueryComplete
```

## Security Architecture

### Authentication & Authorization Flow

```mermaid
graph TD
    Request[Incoming Request]

    Request --> CORS[CORS Check]
    CORS --> Helmet[Security Headers]
    Helmet --> RateLimit[Rate Limit Check]

    RateLimit --> AuthCheck{Requires Auth?}

    AuthCheck -->|No| ValidateInput[Input Validation]
    AuthCheck -->|Yes| ExtractToken[Extract JWT]

    ExtractToken --> VerifyToken[Verify Token]
    VerifyToken --> TokenValid{Valid?}

    TokenValid -->|No| Unauthorized[401 Unauthorized]
    TokenValid -->|Yes| GetUser[Get User from Redis/DB]

    GetUser --> CheckExpiry{User Expired?}
    CheckExpiry -->|Yes| Unauthorized
    CheckExpiry -->|No| ValidateInput

    ValidateInput --> CheckSpam[Spam Detection]
    CheckSpam --> SpamDetected{Is Spam?}

    SpamDetected -->|Yes| Block[403 Blocked]
    SpamDetected -->|No| Controller[Route Controller]

    Controller --> Response[Success Response]
```

### Data Flow Security Layers

```mermaid
graph LR
    subgraph "Transport Security"
        TLS[TLS 1.3<br/>SSL Certificates]
        WSS[WSS<br/>Secure WebSocket]
    end

    subgraph "Application Security"
        JWT[JWT Tokens<br/>HS256]
        CORS[CORS Policy<br/>Whitelist Origins]
        Helmet[Helmet.js<br/>Security Headers]
        CSP[Content Security Policy]
    end

    subgraph "Input Security"
        Validation[Zod Validation<br/>Schema Enforcement]
        Sanitization[Input Sanitization<br/>XSS Prevention]
        Parameterized[Parameterized Queries<br/>SQL Injection Prevention]
    end

    subgraph "Rate Limiting"
        TokenBucket[Token Bucket Algorithm]
        IPLimit[IP-based Limiting]
        UserLimit[User-based Limiting]
    end

    subgraph "Data Security"
        Encryption[bcrypt Password Hashing]
        Secrets[Environment Variables<br/>.env]
    end

    TLS --> JWT
    WSS --> JWT
    JWT --> CORS
    CORS --> Helmet
    Helmet --> CSP

    CSP --> Validation
    Validation --> Sanitization
    Sanitization --> Parameterized

    Parameterized --> TokenBucket
    TokenBucket --> IPLimit
    IPLimit --> UserLimit

    UserLimit --> Encryption
    Encryption --> Secrets
```

## Deployment Architecture

### Production Deployment on AWS

```mermaid
graph TB
    subgraph "Edge Layer"
        Route53[Route 53<br/>DNS]
        CloudFront[CloudFront CDN<br/>Static Assets]
        WAF[AWS WAF<br/>DDoS Protection]
    end

    subgraph "Load Balancing"
        ALB[Application Load Balancer<br/>SSL Termination]
    end

    subgraph "Compute - AZ1"
        ECS1[ECS Fargate<br/>Backend Container 1]
        ECS2[ECS Fargate<br/>Backend Container 2]
    end

    subgraph "Compute - AZ2"
        ECS3[ECS Fargate<br/>Backend Container 3]
        ECS4[ECS Fargate<br/>Backend Container 4]
    end

    subgraph "Database - Multi-AZ"
        RDS_Primary[(RDS PostgreSQL<br/>Primary - AZ1)]
        RDS_Standby[(RDS PostgreSQL<br/>Standby - AZ2)]
        RDS_Replica[(Read Replica<br/>AZ1)]
    end

    subgraph "Cache - Multi-AZ"
        ElastiCache1[(ElastiCache Redis<br/>Primary - AZ1)]
        ElastiCache2[(ElastiCache Redis<br/>Replica - AZ2)]
    end

    subgraph "Storage"
        S3[S3 Bucket<br/>Logs + Backups]
    end

    subgraph "Monitoring"
        CloudWatch[CloudWatch<br/>Metrics + Logs]
        SNS[SNS<br/>Alerts]
    end

    Route53 --> WAF
    WAF --> CloudFront
    WAF --> ALB

    ALB --> ECS1
    ALB --> ECS2
    ALB --> ECS3
    ALB --> ECS4

    ECS1 --> RDS_Primary
    ECS2 --> RDS_Primary
    ECS3 --> RDS_Primary
    ECS4 --> RDS_Primary

    ECS1 --> RDS_Replica
    ECS2 --> RDS_Replica
    ECS3 --> RDS_Replica
    ECS4 --> RDS_Replica

    RDS_Primary -.replicates.-> RDS_Standby
    RDS_Primary -.replicates.-> RDS_Replica

    ECS1 --> ElastiCache1
    ECS2 --> ElastiCache1
    ECS3 --> ElastiCache1
    ECS4 --> ElastiCache1

    ElastiCache1 -.replicates.-> ElastiCache2

    ECS1 --> S3
    ECS2 --> S3
    ECS3 --> S3
    ECS4 --> S3

    ECS1 --> CloudWatch
    ECS2 --> CloudWatch
    ECS3 --> CloudWatch
    ECS4 --> CloudWatch

    CloudWatch --> SNS
```

### Container Architecture

```mermaid
graph TB
    subgraph "Docker Compose Stack"
        subgraph "Application Containers"
            Backend1[Backend Container 1<br/>Node.js + Express<br/>Port: 3000]
            Backend2[Backend Container 2<br/>Node.js + Express<br/>Port: 3001]
            Frontend[Frontend Container<br/>Nginx + React<br/>Port: 80/443]
            Scheduler[Scheduler Container<br/>Node.js Cron Jobs]
        end

        subgraph "Database Containers"
            PostgreSQL[PostgreSQL 14<br/>Port: 5432]
            Redis[Redis 7<br/>Port: 6379]
        end

        subgraph "Reverse Proxy"
            Nginx[Nginx<br/>Load Balancer<br/>Port: 80/443]
        end

        subgraph "Volumes"
            DBData[(postgres_data)]
            RedisData[(redis_data)]
            Logs[(log_volume)]
            SSL[(ssl_certs)]
        end
    end

    Nginx --> Backend1
    Nginx --> Backend2
    Nginx --> Frontend

    Backend1 --> PostgreSQL
    Backend2 --> PostgreSQL
    Scheduler --> PostgreSQL

    Backend1 --> Redis
    Backend2 --> Redis
    Scheduler --> Redis

    PostgreSQL --> DBData
    Redis --> RedisData
    Backend1 --> Logs
    Backend2 --> Logs
    Nginx --> SSL
```

## Performance Optimization

### Caching Strategy

```mermaid
graph LR
    subgraph "Client-Side Cache"
        Browser[Browser Cache<br/>Static Assets]
        ServiceWorker[Service Worker<br/>Offline Support]
    end

    subgraph "CDN Cache"
        CloudFront[CloudFront<br/>Edge Locations]
    end

    subgraph "Application Cache"
        Redis1[Redis Cache<br/>API Responses]
        Redis2[Redis Cache<br/>Session Data]
        Redis3[Redis Cache<br/>Rate Limit Counters]
    end

    subgraph "Database Cache"
        QueryCache[Query Result Cache]
        ConnectionPool[Connection Pooling<br/>PgBouncer]
    end

    Browser --> CloudFront
    CloudFront --> Redis1
    Redis1 --> QueryCache
    Redis2 --> ConnectionPool
    Redis3 --> ConnectionPool
```

## Monitoring & Observability

### Monitoring Stack

```mermaid
graph TB
    subgraph "Application"
        Backend[Backend API]
        Jobs[Background Jobs]
        Socket[Socket.io]
    end

    subgraph "Metrics Collection"
        Prometheus[Prometheus<br/>Time-series Metrics]
        StatsD[StatsD<br/>Custom Metrics]
    end

    subgraph "Log Aggregation"
        Winston[Winston Logger]
        CloudWatch[CloudWatch Logs]
        Elasticsearch[Elasticsearch]
    end

    subgraph "APM"
        Sentry[Sentry<br/>Error Tracking]
        DataDog[DataDog APM<br/>Performance]
    end

    subgraph "Visualization"
        Grafana[Grafana<br/>Dashboards]
        Kibana[Kibana<br/>Log Search]
    end

    subgraph "Alerting"
        AlertManager[Alert Manager]
        PagerDuty[PagerDuty<br/>On-call]
        Slack[Slack<br/>Notifications]
    end

    Backend --> Prometheus
    Backend --> Winston
    Backend --> Sentry
    Backend --> DataDog

    Jobs --> Winston
    Socket --> Prometheus

    Prometheus --> Grafana
    Winston --> CloudWatch
    Winston --> Elasticsearch
    Elasticsearch --> Kibana

    Prometheus --> AlertManager
    Sentry --> Slack
    AlertManager --> PagerDuty
    AlertManager --> Slack
```

---

## Summary

brew_me_in follows a modern, scalable microservices-inspired architecture with:

- **Layered Architecture** for separation of concerns
- **Real-time Capabilities** via WebSocket (Socket.io)
- **Horizontal Scalability** with stateless backend instances
- **Caching Strategy** with Redis for performance
- **Security-First Design** with multiple protection layers
- **Comprehensive Monitoring** for observability
- **Production-Ready Deployment** with Docker and cloud platforms

For detailed component documentation, see:
- [Authentication Component](./components/AUTHENTICATION.md)
- [Chat System Component](./components/CHAT_SYSTEM.md)
- [Rate Limiting Component](./components/RATE_LIMITING.md)
- [Matching Component](./components/MATCHING.md)
- [AI Agent Component](./components/AI_AGENT.md)

---

**Last Updated**: 2025-11-19
