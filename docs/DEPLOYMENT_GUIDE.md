# Deployment Guide

## 🚀 **Tổng quan Deployment**

Hướng dẫn deploy Chatbot Workflow Platform từ development đến production, bao gồm Docker, database setup, và Facebook integration.

---

## 📋 **System Requirements**

### **Minimum Requirements**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: Stable internet connection
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Docker support

### **Recommended Production**
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Load Balancer**: Nginx/CloudFlare
- **Database**: Managed PostgreSQL
- **Monitoring**: Logs aggregation

---

## 🔧 **Pre-deployment Setup**

### **1. Domain & SSL**
```bash
# Set up domain
your-domain.com
api.your-domain.com

# SSL certificates (Let's Encrypt)
sudo apt install certbot
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

### **2. Facebook App Configuration**
```bash
# Facebook Developer Console
1. Create Facebook App
2. Add Messenger Product
3. Set Webhook URL: https://api.your-domain.com/facebook/webhook
4. Set Verify Token: your-webhook-verify-token
5. Subscribe to page events: messages, messaging_postbacks
6. Get App ID & App Secret
```

### **3. Database Setup**
```bash
# PostgreSQL Installation
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE chatbot_db;
CREATE USER chatbot_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE chatbot_db TO chatbot_user;
\q
```

---

## 🐋 **Docker Deployment**

### **1. Project Structure**
```
project/
├── docker-compose.yml
├── docker-compose.prod.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── nginx/
│   ├── nginx.conf
│   └── ssl/
└── .env.production
```

### **2. Backend Dockerfile**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build the source code
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main"]
```

### **3. Frontend Dockerfile**
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build the app
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Production image with Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### **4. Docker Compose - Production**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15-alpine
    container_name: chatbot-postgres
    environment:
      POSTGRES_DB: ${DATABASE_NAME}
      POSTGRES_USER: ${DATABASE_USERNAME}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - chatbot-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: chatbot-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - chatbot-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: chatbot-backend
    environment:
      NODE_ENV: production
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: ${DATABASE_NAME}
      DATABASE_USERNAME: ${DATABASE_USERNAME}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      FACEBOOK_APP_ID: ${FACEBOOK_APP_ID}
      FACEBOOK_APP_SECRET: ${FACEBOOK_APP_SECRET}
      FACEBOOK_REDIRECT_URI: ${FACEBOOK_REDIRECT_URI}
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - chatbot-network
    volumes:
      - ./logs:/app/logs

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: chatbot-frontend
    ports:
      - "3000:80"
    restart: unless-stopped
    networks:
      - chatbot-network

  # Nginx Load Balancer
  nginx:
    image: nginx:alpine
    container_name: chatbot-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
    networks:
      - chatbot-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  chatbot-network:
    driver: bridge
```

### **5. Environment Configuration**
```bash
# .env.production
NODE_ENV=production
PORT=3001

# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=chatbot_db
DATABASE_USERNAME=chatbot_user
DATABASE_PASSWORD=secure_database_password

# JWT
JWT_SECRET=super-secure-jwt-secret-for-production
JWT_EXPIRES_IN=24h

# Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=https://api.your-domain.com/facebook/oauth/callback
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API
API_BASE_URL=https://api.your-domain.com
FRONTEND_URL=https://your-domain.com

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs
```

---

## 🌐 **Nginx Configuration**

### **nginx.conf**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=100r/s;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Frontend (React App)
    server {
        listen 80;
        listen 443 ssl;
        server_name your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        # Redirect HTTP to HTTPS
        if ($scheme != "https") {
            return 301 https://$host$request_uri;
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # React Router support
            try_files $uri $uri/ /index.html;
        }

        # Static assets caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    server {
        listen 80;
        listen 443 ssl;
        server_name api.your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        # Redirect HTTP to HTTPS
        if ($scheme != "https") {
            return 301 https://$host$request_uri;
        }

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # CORS headers
            add_header Access-Control-Allow-Origin "https://your-domain.com";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type";

            # Handle preflight requests
            if ($request_method = 'OPTIONS') {
                add_header Access-Control-Allow-Origin "https://your-domain.com";
                add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
                add_header Access-Control-Allow-Headers "Authorization, Content-Type";
                add_header Access-Control-Max-Age 1728000;
                add_header Content-Type "text/plain; charset=utf-8";
                add_header Content-Length 0;
                return 204;
            }
        }

        # Facebook webhook (higher rate limit)
        location /facebook/webhook {
            limit_req zone=webhook burst=200 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health checks
        location /health {
            proxy_pass http://backend;
            access_log off;
        }
    }
}
```

---

## 🚀 **Deployment Steps**

### **1. Server Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply docker group
```

### **2. Project Deployment**
```bash
# Clone repository
git clone https://github.com/your-repo/chatbot-platform.git
cd chatbot-platform

# Create production environment file
cp .env.example .env.production
# Edit .env.production with your values

# Create necessary directories
mkdir -p logs nginx/ssl postgres

# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check services status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### **3. Database Migration**
```bash
# Run database migrations
docker exec chatbot-backend npm run migration:run

# Create initial admin user (optional)
docker exec -it chatbot-backend npm run seed:admin
```

### **4. SSL Certificate Setup**
```bash
# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Get SSL certificates
sudo certbot certonly --standalone -d your-domain.com -d api.your-domain.com

# Restart nginx
docker-compose -f docker-compose.prod.yml start nginx
```

---

## 🔧 **Production Configuration**

### **1. Backend Environment**
```bash
# backend/.env.production
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/chatbot_db
DATABASE_SSL=true
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://redis:6379
REDIS_TTL=3600

# Security
JWT_SECRET=very-secure-secret-key-min-32-chars
BCRYPT_ROUNDS=12

# Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_VERIFY_TOKEN=your-webhook-verify-token

# Monitoring
LOG_LEVEL=warn
ENABLE_METRICS=true
HEALTH_CHECK_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100        # requests per window
```

### **2. Frontend Build Configuration**
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          reactflow: ['reactflow'],
          ui: ['@mui/material', '@mui/icons-material']
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.VITE_API_URL': '"https://api.your-domain.com"'
  },
  server: {
    host: '0.0.0.0',
    port: 3000
  }
})
```

---

## 📊 **Monitoring & Logging**

### **1. Docker Compose with Monitoring**
```yaml
# Add to docker-compose.prod.yml
  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: chatbot-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - chatbot-network

  grafana:
    image: grafana/grafana:latest
    container_name: chatbot-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - chatbot-network
```

### **2. Log Management**
```bash
# Log rotation configuration
sudo nano /etc/logrotate.d/chatbot

/var/log/chatbot/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 root root
    postrotate
        docker-compose -f /path/to/docker-compose.prod.yml restart backend
    endscript
}
```

### **3. Health Checks**
```bash
# Health check script
#!/bin/bash
# health-check.sh

API_URL="https://api.your-domain.com"

# Check API health
curl -f $API_URL/health || exit 1

# Check database health
curl -f $API_URL/health/db || exit 1

# Check Facebook integration
curl -f $API_URL/health/facebook || exit 1

echo "All health checks passed"
```

---

## 🔒 **Security Configuration**

### **1. Firewall Setup**
```bash
# UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### **2. Docker Security**
```bash
# Create non-root user for containers
# Already included in Dockerfiles

# Limit container resources
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### **3. Environment Security**
```bash
# Secure environment file
chmod 600 .env.production

# Use Docker secrets (advanced)
echo "my-secret" | docker secret create jwt-secret -
```

---

## 🔄 **CI/CD Pipeline**

### **1. GitHub Actions**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.4
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /path/to/chatbot-platform
          git pull origin main
          docker-compose -f docker-compose.prod.yml down
          docker-compose -f docker-compose.prod.yml build
          docker-compose -f docker-compose.prod.yml up -d
          docker system prune -f
```

### **2. Deployment Script**
```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Build new images
docker-compose -f docker-compose.prod.yml build

# Stop services gracefully
docker-compose -f docker-compose.prod.yml down

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
sleep 30

# Health check
curl -f https://api.your-domain.com/health

echo "✅ Deployment completed successfully!"
```

---

## 🛠️ **Maintenance & Updates**

### **1. Regular Updates**
```bash
# Weekly maintenance script
#!/bin/bash
# maintenance.sh

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull

# Restart services with new images
docker-compose -f docker-compose.prod.yml up -d

# Clean up old images
docker image prune -f

# Backup database
docker exec chatbot-postgres pg_dump -U chatbot_user chatbot_db > backup_$(date +%Y%m%d).sql
```

### **2. Backup Strategy**
```bash
# Automated backup script
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker exec chatbot-postgres pg_dump -U chatbot_user chatbot_db > $BACKUP_DIR/db_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz ./logs ./uploads

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/ s3://your-backup-bucket/ --recursive

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### **3. Rollback Strategy**
```bash
# Rollback to previous version
#!/bin/bash
# rollback.sh

echo "🔄 Rolling back to previous version..."

# Stop current services
docker-compose -f docker-compose.prod.yml down

# Checkout previous commit
git checkout HEAD~1

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Rollback completed!"
```

---

## 📋 **Troubleshooting**

### **Common Issues**

**1. Container Won't Start**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check container status
docker ps -a

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

**2. Database Connection Issues**
```bash
# Check PostgreSQL logs
docker logs chatbot-postgres

# Test connection
docker exec -it chatbot-postgres psql -U chatbot_user -d chatbot_db

# Reset database (caution!)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

**3. Facebook Webhook Issues**
```bash
# Test webhook endpoint
curl -X GET "https://api.your-domain.com/facebook/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=your-token"

# Check Facebook app settings
# Verify webhook URL and verify token match
```

### **Performance Optimization**
```bash
# Monitor resource usage
docker stats

# Optimize Docker images
docker system df
docker system prune -a

# Database optimization
docker exec -it chatbot-postgres psql -U chatbot_user -d chatbot_db -c "VACUUM ANALYZE;"
```

---

## 📈 **Scaling Considerations**

### **Horizontal Scaling**
```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
      
  nginx:
    depends_on:
      - backend
    # Load balance across backend replicas
```

### **Database Scaling**
```bash
# Read replicas for PostgreSQL
# Connection pooling with PgBouncer
# Database sharding by user_id
```

### **Monitoring at Scale**
```bash
# Implement proper logging
# Set up alerts for critical metrics
# Use external monitoring services
# Implement distributed tracing
``` 