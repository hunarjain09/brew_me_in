# Deployment Guide

Complete guide for deploying brew_me_in to production environments, including Docker, cloud platforms, and best practices.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Cloud Platforms](#cloud-platforms)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Security Hardening](#security-hardening)
- [CI/CD Pipeline](#cicd-pipeline)
- [Scaling Strategy](#scaling-strategy)

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Environment variables configured for production
- [ ] Database migrations tested
- [ ] SSL certificates obtained
- [ ] Domain names configured
- [ ] Backup strategy in place
- [ ] Monitoring tools set up
- [ ] API keys secured (Anthropic, etc.)
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured appropriately
- [ ] Error tracking enabled (Sentry, etc.)

## Environment Configuration

### Production Environment Variables

Create `backend/.env.production`:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database Configuration (Use managed service)
DATABASE_URL=postgresql://user:password@db-host:5432/brew_me_in?ssl=true
DB_HOST=your-db-host.amazonaws.com
DB_PORT=5432
DB_NAME=brew_me_in
DB_USER=brew_admin
DB_PASSWORD=strong-password-here
DB_SSL=true
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000

# Redis Configuration (Use managed service)
REDIS_HOST=your-redis-host.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=strong-redis-password
REDIS_TLS=true
REDIS_DB=0

# JWT Configuration (Use strong secrets)
JWT_SECRET=use-output-of-openssl-rand-base64-64-here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=use-different-openssl-rand-base64-64-here
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS Configuration (Restrict to your domains)
CORS_ORIGIN=https://app.brewmein.com,https://admin.brewmein.com

# API URL
API_URL=https://api.brewmein.com

# Rate Limiting Configuration
RATE_LIMIT_MESSAGE_FREE_COUNT=30
RATE_LIMIT_MESSAGE_FREE_WINDOW=3600
RATE_LIMIT_MESSAGE_BADGE_COUNT=60
RATE_LIMIT_MESSAGE_BADGE_WINDOW=3600
RATE_LIMIT_MESSAGE_COOLDOWN_FREE=30
RATE_LIMIT_MESSAGE_COOLDOWN_BADGE=15
RATE_LIMIT_AGENT_PERSONAL_COUNT=2
RATE_LIMIT_AGENT_GLOBAL_COOLDOWN=120
RATE_LIMIT_POKE_COUNT=5
RATE_LIMIT_POKE_WINDOW=86400

# Spam Detection Configuration
SPAM_DETECTION_ENABLED=true
SPAM_MAX_CAPS_PERCENTAGE=50
SPAM_MAX_URLS=2
SPAM_MUTE_DURATION=86400
SPAM_DUPLICATE_WINDOW=300

# Badge Configuration
BADGE_TIP_THRESHOLD=5
BADGE_TIP_WINDOW_DAYS=7
BADGE_DURATION_DAYS=30

# User Configuration
USER_SESSION_DURATION_HOURS=24
USER_CLEANUP_INTERVAL_HOURS=1

# Location Validation
LOCATION_VALIDATION_RADIUS=100
WIFI_VALIDATION_ENABLED=true
GPS_VALIDATION_ENABLED=true

# Anthropic AI Configuration
ANTHROPIC_API_KEY=sk-ant-api03-your-production-key-here
ANTHROPIC_MODEL=claude-sonnet-4-5-20250514
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.7

# Scheduler Configuration
ENABLE_SCHEDULER=true
ENABLE_PROACTIVE_MESSAGES=true
PROACTIVE_MESSAGE_INTERVAL=120000
PROACTIVE_MESSAGE_COOLDOWN=300000

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DATADOG_API_KEY=your-datadog-api-key

# Logging
LOG_FILE_PATH=/var/log/brew_me_in
LOG_MAX_SIZE=10m
LOG_MAX_FILES=7d
```

### Frontend Environment Variables

Create `frontend/.env.production`:

```env
VITE_API_URL=https://api.brewmein.com
VITE_WS_URL=https://api.brewmein.com
VITE_ENABLE_MOCK_DATA=false
VITE_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project-id
```

### Generate Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 64

# Generate session secret
openssl rand -hex 32

# Generate database password
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
```

## Docker Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_USER: brew_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: brew_me_in
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    networks:
      - brew_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U brew_admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - brew_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    restart: always
    environment:
      NODE_ENV: production
    env_file:
      - ./backend/.env.production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - brew_network
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
      args:
        VITE_API_URL: https://api.brewmein.com
        VITE_WS_URL: https://api.brewmein.com
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - brew_network
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - brew_network

volumes:
  postgres_data:
  redis_data:

networks:
  brew_network:
    driver: bridge
```

### Production Dockerfile

Backend `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built files and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package*.json ./

# Create log directory
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

Frontend `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Deploy with Docker

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## Cloud Platforms

### AWS Deployment

#### Architecture

```
Route 53 (DNS)
    ↓
CloudFront (CDN) → S3 (Frontend Static Assets)
    ↓
ALB (Load Balancer)
    ↓
ECS Fargate (Backend Containers)
    ↓
RDS PostgreSQL + ElastiCache Redis
```

#### Services Setup

**1. RDS PostgreSQL:**

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier brew-me-in-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.7 \
  --master-username brew_admin \
  --master-user-password ${DB_PASSWORD} \
  --allocated-storage 20 \
  --storage-type gp3 \
  --backup-retention-period 7 \
  --multi-az \
  --vpc-security-group-ids sg-xxxxxx \
  --db-subnet-group-name brew-db-subnet

# Run migrations
psql -h your-rds-endpoint.amazonaws.com -U brew_admin -d brew_me_in -f backend/src/db/schema.sql
```

**2. ElastiCache Redis:**

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id brew-me-in-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name brew-redis-subnet \
  --security-group-ids sg-xxxxxx
```

**3. ECS Fargate:**

```bash
# Create ECR repository
aws ecr create-repository --repository-name brew-me-in-backend

# Build and push image
docker build -t brew-me-in-backend ./backend
docker tag brew-me-in-backend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/brew-me-in-backend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/brew-me-in-backend:latest

# Create ECS task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create ECS service
aws ecs create-service \
  --cluster brew-me-in-cluster \
  --service-name brew-me-in-backend \
  --task-definition brew-me-in-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

**4. S3 + CloudFront (Frontend):**

```bash
# Create S3 bucket
aws s3 mb s3://brew-me-in-frontend

# Build and upload frontend
cd frontend
npm run build
aws s3 sync dist/ s3://brew-me-in-frontend/

# Create CloudFront distribution
aws cloudfront create-distribution --cli-input-json file://cloudfront-config.json
```

### Heroku Deployment

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create brew-me-in-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Add Redis
heroku addons:create heroku-redis:premium-0

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 64)
heroku config:set ANTHROPIC_API_KEY=your-api-key

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate

# Scale
heroku ps:scale web=2
```

### DigitalOcean Deployment

```bash
# Install doctl
brew install doctl  # macOS
snap install doctl  # Linux

# Authenticate
doctl auth init

# Create Droplet
doctl compute droplet create brew-me-in \
  --image docker-20-04 \
  --size s-2vcpu-4gb \
  --region nyc1

# Create managed database
doctl databases create brew-me-in-db \
  --engine pg \
  --version 14 \
  --size db-s-2vcpu-4gb \
  --region nyc1

# Create managed Redis
doctl databases create brew-me-in-redis \
  --engine redis \
  --version 7 \
  --size db-s-1vcpu-2gb \
  --region nyc1

# Deploy via Docker
ssh root@your-droplet-ip
git clone your-repo
cd brew_me_in
docker-compose -f docker-compose.prod.yml up -d
```

### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Add Redis
railway add --plugin redis

# Deploy
railway up

# Set environment variables
railway variables set JWT_SECRET=$(openssl rand -base64 64)
railway variables set ANTHROPIC_API_KEY=your-api-key

# View logs
railway logs
```

## Database Setup

### Production PostgreSQL Configuration

**Connection pooling with PgBouncer:**

```ini
# pgbouncer.ini
[databases]
brew_me_in = host=rds-endpoint port=5432 dbname=brew_me_in

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
```

Update backend configuration:

```env
DATABASE_URL=postgresql://user:pass@pgbouncer-host:6432/brew_me_in
```

### Backup Strategy

```bash
# Automated daily backups
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="brew_me_in"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -b -v -f ${BACKUP_DIR}/backup_${DATE}.dump

# Upload to S3
aws s3 cp ${BACKUP_DIR}/backup_${DATE}.dump s3://brew-me-in-backups/

# Delete local backups older than 7 days
find ${BACKUP_DIR} -name "backup_*.dump" -mtime +7 -delete

# Keep only last 30 backups in S3
aws s3 ls s3://brew-me-in-backups/ | sort -r | tail -n +31 | awk '{print $4}' | xargs -I {} aws s3 rm s3://brew-me-in-backups/{}
```

Add to crontab:

```bash
# Run daily at 2 AM
0 2 * * * /opt/scripts/backup-db.sh
```

### Restore from Backup

```bash
# Download backup from S3
aws s3 cp s3://brew-me-in-backups/backup_20250119_020000.dump ./

# Restore
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -v backup_20250119_020000.dump

# Verify
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM users;"
```

## Redis Setup

### Production Redis Configuration

**redis.conf:**

```conf
# Security
requirepass your-strong-password
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfilename "appendonly.aof"

# Performance
tcp-backlog 511
timeout 300
tcp-keepalive 300
```

### Redis Backup

```bash
# Manual backup
redis-cli --rdb /backups/redis-backup-$(date +%Y%m%d).rdb

# Automated with cron
0 3 * * * redis-cli --rdb /backups/redis-backup-$(date +\%Y\%m\%d).rdb && aws s3 cp /backups/redis-backup-$(date +\%Y\%m\%d).rdb s3://brew-me-in-backups/redis/
```

## SSL/TLS Configuration

### Obtain SSL Certificate with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.brewmein.com -d app.brewmein.com

# Auto-renewal
sudo certbot renew --dry-run

# Add to crontab
0 0 1 * * certbot renew --quiet
```

### Nginx SSL Configuration

```nginx
# /etc/nginx/sites-available/brew-me-in

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.brewmein.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name api.brewmein.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.brewmein.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.brewmein.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring & Logging

### Application Monitoring with PM2

```bash
# Install PM2
npm install -g pm2

# Start application
cd backend
pm2 start dist/index.js --name brew-me-in-api -i max

# Enable startup script
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs brew-me-in-api

# Reload after updates
pm2 reload brew-me-in-api --update-env
```

### Logging with Winston + LogDNA/Papertrail

Already configured in `backend/src/config/logger.ts`. Add transport:

```typescript
// Add to logger.ts
import { Loggly } from 'winston-loggly-bulk';

logger.add(new Loggly({
  token: process.env.LOGGLY_TOKEN,
  subdomain: 'your-subdomain',
  tags: ['brew-me-in', 'production'],
  json: true
}));
```

### Metrics with Prometheus + Grafana

**prometheus.yml:**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'brew-me-in-api'
    static_configs:
      - targets: ['localhost:3000']
```

Add Prometheus endpoint to backend:

```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Security Hardening

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5432/tcp   # Block direct DB access
sudo ufw deny 6379/tcp   # Block direct Redis access
sudo ufw enable

# Verify
sudo ufw status
```

### Security Checklist

- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS only (redirect HTTP)
- [ ] Set secure cookie flags (`httpOnly`, `secure`, `sameSite`)
- [ ] Implement rate limiting on all endpoints
- [ ] Use Helmet.js for security headers
- [ ] Validate and sanitize all inputs
- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Implement CSRF protection
- [ ] Set up Content Security Policy (CSP)
- [ ] Enable CORS only for trusted origins
- [ ] Use strong JWT secrets (64+ characters)
- [ ] Implement API authentication
- [ ] Set up database connection limits
- [ ] Disable directory listing
- [ ] Remove server version headers
- [ ] Set up fail2ban for SSH protection
- [ ] Regular security updates (`apt update && apt upgrade`)

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push backend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: brew-me-in-backend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG ./backend
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Update ECS service
        run: |
          aws ecs update-service --cluster brew-me-in-cluster --service brew-me-in-backend --force-new-deployment
```

## Scaling Strategy

### Horizontal Scaling

**Backend:**
- Use load balancer (ALB, Nginx)
- Run multiple backend instances
- Session storage in Redis (already implemented)
- Stateless architecture (already implemented)

**Database:**
- Read replicas for read-heavy operations
- Connection pooling (PgBouncer)
- Query optimization and indexing

**Redis:**
- Redis Cluster for horizontal scaling
- Redis Sentinel for high availability

### Vertical Scaling

**Resource Recommendations:**

| Users | Backend | Database | Redis | Estimated Cost/mo |
|-------|---------|----------|-------|-------------------|
| 0-1K | 1x 2GB RAM | db.t3.micro | cache.t3.micro | $50 |
| 1K-10K | 2x 4GB RAM | db.t3.small | cache.t3.small | $150 |
| 10K-50K | 4x 8GB RAM | db.t3.medium | cache.t3.medium | $500 |
| 50K-100K | 8x 16GB RAM | db.r5.large | cache.r5.large | $1500 |

### Performance Optimization

1. **Enable caching:**
   - API response caching (Redis)
   - CDN for static assets (CloudFront, Cloudflare)
   - Database query result caching

2. **Optimize queries:**
   - Add indexes on frequently queried columns
   - Use `EXPLAIN ANALYZE` to identify slow queries
   - Implement pagination for large datasets

3. **Optimize WebSocket:**
   - Use Redis adapter for Socket.io clustering
   - Implement connection throttling
   - Clean up disconnected sockets

4. **CDN Integration:**
   - Serve static assets from CDN
   - Cache API responses at edge locations
   - Implement cache invalidation strategy

## Post-Deployment

### Health Checks

```bash
# API health
curl https://api.brewmein.com/api/health

# WebSocket connection
wscat -c wss://api.brewmein.com/socket.io/?EIO=4&transport=websocket

# Database connectivity
psql -h your-db-host -U brew_admin -d brew_me_in -c "SELECT 1;"

# Redis connectivity
redis-cli -h your-redis-host -a your-password ping
```

### Monitoring Alerts

Set up alerts for:
- API response time > 1s
- Error rate > 1%
- CPU usage > 80%
- Memory usage > 85%
- Disk usage > 90%
- Database connections > 80% of max
- Redis memory usage > 90%
- SSL certificate expiration < 30 days

### Regular Maintenance

- **Daily**: Review logs for errors
- **Weekly**: Check performance metrics
- **Monthly**: Database optimization (VACUUM, ANALYZE)
- **Quarterly**: Security audit and dependency updates

---

**Last Updated**: 2025-11-19

For additional help, refer to:
- [Development Setup](./DEVELOPMENT_SETUP.md)
- [Architecture Overview](./docs/ARCHITECTURE_OVERVIEW.md)
- [Component Documentation](./docs/components/)
