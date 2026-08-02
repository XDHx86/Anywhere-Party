# Deployment Guide

This guide covers deploying the Watch Party Extension in various environments, from local development to production.

## Table of Contents

- [Local Development](#local-development)
- [Staging Environment](#staging-environment)
- [Production Deployment](#production-deployment)
- [Configuration Management](#configuration-management)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Local Development

### Quick Start with Docker

The fastest way to get started is using Docker Compose:

```bash
# Clone repository
git clone <repository-url>
cd watch-party-extension

# Start development environment
docker-compose up -d

# Build extension
npm install
npm run build

# Load extension in browser
# Chrome: chrome://extensions/ -> Load unpacked -> dist/chrome
# Firefox: about:debugging -> Load Temporary Add-on -> dist/firefox/manifest.json
```

### Manual Setup

For development without Docker:

1. **Install Dependencies**
   ```bash
   # Install Node.js dependencies
   npm install
   cd server && npm install && cd ..
   
   # Install PostgreSQL and Redis (optional for lightweight mode)
   # On macOS with Homebrew:
   brew install postgresql redis
   
   # On Ubuntu:
   sudo apt-get install postgresql redis-server
   ```

2. **Configure Environment**
   ```bash
   # Copy configuration templates
   cp extension-config.example.json extension-config.local.json
   cp server/.env.example server/.env
   
   # Edit extension-config.local.json
   {
     "LOCAL_DEV_MODE": true,
     "SIGNALING_SERVER": "ws://localhost:3001",
     "TELEMETRY_ENABLED": false
   }
   ```

3. **Start Services**
   ```bash
   # Option 1: Lightweight mode (no database required)
   npm run dev:server
   
   # Option 2: Full mode with database
   # Start PostgreSQL and Redis first
   npm run server:dev
   ```

4. **Build and Load Extension**
   ```bash
   npm run build
   # Load dist/chrome or dist/firefox in browser
   ```

### Development Tools

Access development tools when using Docker:

- **Database Admin**: http://localhost:8080 (Adminer)
- **Redis Commander**: http://localhost:8081
- **Server Health**: http://localhost:3001/health
- **Feature Flags**: http://localhost:3002/flags

## Staging Environment

### AWS Deployment

Deploy to AWS using ECS and RDS:

1. **Infrastructure Setup**
   ```bash
   # Create VPC and subnets
   aws ec2 create-vpc --cidr-block 10.0.0.0/16
   
   # Create RDS PostgreSQL instance
   aws rds create-db-instance \
     --db-instance-identifier watchparty-staging \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username watchparty \
     --master-user-password <secure-password> \
     --allocated-storage 20
   
   # Create ElastiCache Redis cluster
   aws elasticache create-cache-cluster \
     --cache-cluster-id watchparty-staging \
     --cache-node-type cache.t3.micro \
     --engine redis \
     --num-cache-nodes 1
   ```

2. **ECS Task Definition**
   ```json
   {
     "family": "watchparty-staging",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "signaling-server",
         "image": "your-registry/watchparty-server:latest",
         "portMappings": [
           {
             "containerPort": 3001,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "staging"
           },
           {
             "name": "DATABASE_URL",
             "value": "postgresql://user:pass@rds-endpoint:5432/watchparty"
           },
           {
             "name": "REDIS_URL",
             "value": "redis://elasticache-endpoint:6379"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/watchparty-staging",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

3. **Application Load Balancer**
   ```bash
   # Create ALB
   aws elbv2 create-load-balancer \
     --name watchparty-staging-alb \
     --subnets subnet-12345 subnet-67890 \
     --security-groups sg-12345
   
   # Create target group
   aws elbv2 create-target-group \
     --name watchparty-staging-tg \
     --protocol HTTP \
     --port 3001 \
     --vpc-id vpc-12345 \
     --target-type ip \
     --health-check-path /health
   ```

### Google Cloud Platform

Deploy using Cloud Run and Cloud SQL:

1. **Build and Push Container**
   ```bash
   # Build production image
   docker build -t gcr.io/your-project/watchparty-server:latest ./server
   
   # Push to Container Registry
   docker push gcr.io/your-project/watchparty-server:latest
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy watchparty-staging \
     --image gcr.io/your-project/watchparty-server:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=staging \
     --set-env-vars DATABASE_URL=postgresql://user:pass@/db?host=/cloudsql/project:region:instance \
     --add-cloudsql-instances project:region:instance
   ```

## Production Deployment

### Kubernetes Deployment

For high availability and scalability:

1. **Namespace and ConfigMap**
   ```yaml
   # namespace.yaml
   apiVersion: v1
   kind: Namespace
   metadata:
     name: watchparty
   
   ---
   # configmap.yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: watchparty-config
     namespace: watchparty
   data:
     NODE_ENV: "production"
     LOG_LEVEL: "info"
     TELEMETRY_ENABLED: "true"
   ```

2. **Secrets**
   ```yaml
   # secrets.yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: watchparty-secrets
     namespace: watchparty
   type: Opaque
   data:
     DATABASE_URL: <base64-encoded-url>
     JWT_SECRET: <base64-encoded-secret>
     ENCRYPTION_KEY: <base64-encoded-key>
   ```

3. **Deployment**
   ```yaml
   # deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: watchparty-server
     namespace: watchparty
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: watchparty-server
     template:
       metadata:
         labels:
           app: watchparty-server
       spec:
         containers:
         - name: server
           image: your-registry/watchparty-server:v1.0.0
           ports:
           - containerPort: 3001
           envFrom:
           - configMapRef:
               name: watchparty-config
           - secretRef:
               name: watchparty-secrets
           livenessProbe:
             httpGet:
               path: /health
               port: 3001
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /health
               port: 3001
             initialDelaySeconds: 5
             periodSeconds: 5
           resources:
             requests:
               memory: "256Mi"
               cpu: "250m"
             limits:
               memory: "512Mi"
               cpu: "500m"
   ```

4. **Service and Ingress**
   ```yaml
   # service.yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: watchparty-service
     namespace: watchparty
   spec:
     selector:
       app: watchparty-server
     ports:
     - port: 80
       targetPort: 3001
     type: ClusterIP
   
   ---
   # ingress.yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: watchparty-ingress
     namespace: watchparty
     annotations:
       kubernetes.io/ingress.class: nginx
       cert-manager.io/cluster-issuer: letsencrypt-prod
       nginx.ingress.kubernetes.io/websocket-services: watchparty-service
   spec:
     tls:
     - hosts:
       - api.watchparty.example.com
       secretName: watchparty-tls
     rules:
     - host: api.watchparty.example.com
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: watchparty-service
               port:
                 number: 80
   ```

### Database Setup

1. **PostgreSQL Configuration**
   ```sql
   -- Create production database
   CREATE DATABASE watchparty_prod;
   CREATE USER watchparty_prod WITH PASSWORD 'secure-password';
   GRANT ALL PRIVILEGES ON DATABASE watchparty_prod TO watchparty_prod;
   
   -- Apply schema
   \c watchparty_prod
   \i server/database/schema.sql
   
   -- Create indexes for performance
   CREATE INDEX CONCURRENTLY idx_rooms_created_at ON rooms(created_at);
   CREATE INDEX CONCURRENTLY idx_participants_room_id ON participants(room_id);
   CREATE INDEX CONCURRENTLY idx_room_events_room_id_timestamp ON room_events(room_id, timestamp);
   ```

2. **Redis Configuration**
   ```conf
   # redis.conf
   bind 127.0.0.1
   port 6379
   timeout 0
   tcp-keepalive 300
   
   # Memory management
   maxmemory 1gb
   maxmemory-policy allkeys-lru
   
   # Persistence
   save 900 1
   save 300 10
   save 60 10000
   
   # Security
   requirepass your-redis-password
   
   # Logging
   loglevel notice
   logfile /var/log/redis/redis-server.log
   ```

## Configuration Management

### Environment-Specific Configs

Create configuration files for each environment:

**Development** (`extension-config.local.json`):
```json
{
  "LOCAL_DEV_MODE": true,
  "SIGNALING_SERVER": "ws://localhost:3001",
  "TELEMETRY_ENABLED": false,
  "LOG_LEVEL": "debug",
  "SYNC_TOLERANCE_MS": 500,
  "HEARTBEAT_INTERVAL_MS": 1000
}
```

**Staging** (`extension-config.staging.json`):
```json
{
  "LOCAL_DEV_MODE": false,
  "SIGNALING_SERVER": "wss://staging-api.watchparty.example.com",
  "TELEMETRY_ENABLED": true,
  "LOG_LEVEL": "info",
  "SYNC_TOLERANCE_MS": 300,
  "HEARTBEAT_INTERVAL_MS": 2000,
  "FEATURE_FLAGS": {
    "VOICE_CHAT": true,
    "ANNOTATIONS": true,
    "SUBTITLES": false
  }
}
```

**Production** (`extension-config.json`):
```json
{
  "LOCAL_DEV_MODE": false,
  "SIGNALING_SERVER": "wss://api.watchparty.example.com",
  "TELEMETRY_ENABLED": true,
  "LOG_LEVEL": "warn",
  "SYNC_TOLERANCE_MS": 300,
  "HEARTBEAT_INTERVAL_MS": 2000,
  "TURN_SERVERS": [
    {
      "urls": "turn:turn.watchparty.example.com:3478",
      "username": "watchparty",
      "credential": "production-turn-password"
    }
  ]
}
```

### Server Environment Variables

**Development** (`.env.development`):
```env
NODE_ENV=development
DATABASE_URL=postgresql://watchparty:watchparty_dev@localhost:5432/watchparty
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-production
ENCRYPTION_KEY=dev-encryption-key-32-chars-long
LOG_LEVEL=debug
TELEMETRY_ENABLED=false
```

**Production** (`.env.production`):
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/watchparty
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=secure-production-jwt-secret
ENCRYPTION_KEY=secure-32-character-encryption-key
LOG_LEVEL=info
TELEMETRY_ENABLED=true
TURN_SERVER_URL=turn:turn.example.com:3478
TURN_USERNAME=production-turn-user
TURN_CREDENTIAL=production-turn-password
OPENSUBTITLES_API_KEY=production-opensubtitles-key
```

## Monitoring and Logging

### Prometheus Metrics

Configure Prometheus to scrape metrics:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'watchparty-server'
    static_configs:
      - targets: ['signaling-server:3001']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'watchparty-feature-flags'
    static_configs:
      - targets: ['feature-flags:3002']
    metrics_path: /metrics
    scrape_interval: 60s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
```

### Grafana Dashboards

Import pre-built dashboards for monitoring:

- **Server Performance**: CPU, memory, request rates
- **WebSocket Connections**: Active connections, message rates
- **Room Analytics**: Room creation, participant counts
- **Database Metrics**: Query performance, connection pools
- **Redis Metrics**: Memory usage, cache hit rates

### Log Aggregation

Configure structured logging with Loki:

```yaml
# loki.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

## Security Considerations

### SSL/TLS Configuration

**Nginx SSL Configuration**:
```nginx
server {
    listen 443 ssl http2;
    server_name api.watchparty.example.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # WebSocket upgrade
    location / {
        proxy_pass http://signaling-server:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Rules

Configure firewall to allow only necessary ports:

```bash
# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow TURN server
ufw allow 3478/udp
ufw allow 49152:65535/udp

# Deny all other incoming
ufw default deny incoming
ufw default allow outgoing
ufw enable
```

### Database Security

1. **Connection Security**
   - Use SSL connections to database
   - Restrict database access to application servers only
   - Use connection pooling with authentication

2. **Data Encryption**
   - Encrypt sensitive data at rest
   - Use application-level encryption for chat messages
   - Implement proper key rotation

### API Security

1. **Rate Limiting**
   ```javascript
   // Express rate limiting
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
     message: 'Too many requests from this IP'
   });
   
   app.use('/api/', limiter);
   ```

2. **Input Validation**
   ```javascript
   const { body, validationResult } = require('express-validator');
   
   app.post('/rooms', [
     body('name').isLength({ min: 1, max: 100 }).escape(),
     body('password').optional().isLength({ min: 4, max: 50 }),
     body('maxParticipants').isInt({ min: 2, max: 100 })
   ], (req, res) => {
     const errors = validationResult(req);
     if (!errors.isEmpty()) {
       return res.status(400).json({ errors: errors.array() });
     }
     // Process request
   });
   ```

## Troubleshooting

### Common Issues

**WebSocket Connection Failures**
```bash
# Check server logs
docker-compose logs signaling-server

# Test WebSocket connection
wscat -c ws://localhost:3001

# Check firewall rules
ufw status
```

**Database Connection Issues**
```bash
# Test database connectivity
psql -h localhost -U watchparty -d watchparty

# Check connection pool
docker-compose exec signaling-server npm run db:status
```

**Performance Issues**
```bash
# Monitor resource usage
docker stats

# Check database performance
docker-compose exec postgres psql -U watchparty -c "SELECT * FROM pg_stat_activity;"

# Monitor Redis memory
docker-compose exec redis redis-cli info memory
```

### Health Checks

Implement comprehensive health checks:

```javascript
// server/health.js
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Database check
    await db.query('SELECT 1');
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'unhealthy';
  }

  try {
    // Redis check
    await redis.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Backup and Recovery

**Database Backup**:
```bash
# Create backup
pg_dump -h localhost -U watchparty watchparty > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -h localhost -U watchparty -d watchparty < backup_20231201_120000.sql
```

**Redis Backup**:
```bash
# Create Redis snapshot
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backup/redis_$(date +%Y%m%d_%H%M%S).rdb
```

This deployment guide provides comprehensive instructions for deploying the Watch Party Extension across different environments while maintaining security, performance, and reliability standards.