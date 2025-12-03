# SafeVoice Scaling Playbook

This playbook provides comprehensive guidance for scaling SafeVoice infrastructure, covering CDN configuration, database scaling strategies, and operational best practices.

## Table of Contents

- [Overview](#overview)
- [CDN Strategy](#cdn-strategy)
- [Database Scaling](#database-scaling)
- [Application Scaling](#application-scaling)
- [Monitoring & Alerting](#monitoring--alerting)
- [Cost Optimization](#cost-optimization)
- [Disaster Recovery](#disaster-recovery)

## Overview

### Scaling Targets

| Metric | Current | Target | Scale Factor |
|--------|---------|--------|--------------|
| Concurrent Users | 1,000 | 100,000 | 100x |
| Requests/Second | 100 | 10,000 | 100x |
| Data Storage | 10GB | 10TB | 1000x |
| Geographic Regions | 1 | 5+ | 5x |

### Architecture Tiers

1. **Edge Layer**: CDN, WAF, DDoS protection
2. **Application Layer**: Kubernetes pods, auto-scaling
3. **Data Layer**: Managed databases, caching, object storage

## CDN Strategy

### Recommended CDN Providers

#### Primary: Cloudflare

**Advantages:**
- Free tier available
- Global Anycast network
- Built-in DDoS protection
- Web Application Firewall (WAF)
- Cache purge API
- Analytics and insights

**Setup:**
1. Sign up at [Cloudflare](https://www.cloudflare.com/)
2. Add your domain
3. Update nameservers
4. Configure SSL/TLS (Full or Full Strict)
5. Enable "Always Use HTTPS"
6. Configure Page Rules for caching

#### Alternative: CloudFront (AWS)

**Advantages:**
- Deep AWS integration
- Pay-as-you-go pricing
- Lambda@Edge for custom logic
- Origin failover
- Real-time logs

**Setup:**
1. Create CloudFront distribution
2. Point origin to your Kubernetes Ingress
3. Configure SSL certificate (ACM)
4. Set up origin access identity
5. Configure cache behaviors

### CDN Configuration

#### Cache Headers

SafeVoice implements caching headers in multiple layers:

**1. public/_headers (Netlify/Cloudflare Pages)**

The `public/_headers` file defines cache rules:

```
# Static assets - cache for 1 year
/assets/*
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

# JavaScript and CSS bundles
*.js
  Cache-Control: public, max-age=31536000, immutable
*.css
  Cache-Control: public, max-age=31536000, immutable

# Images
*.png
  Cache-Control: public, max-age=31536000, immutable
*.jpg
  Cache-Control: public, max-age=31536000, immutable
*.svg
  Cache-Control: public, max-age=31536000, immutable
*.webp
  Cache-Control: public, max-age=31536000, immutable

# Fonts
*.woff2
  Cache-Control: public, max-age=31536000, immutable
*.woff
  Cache-Control: public, max-age=31536000, immutable
*.ttf
  Cache-Control: public, max-age=31536000, immutable

# HTML - short cache with revalidation
/*.html
  Cache-Control: public, max-age=3600, must-revalidate
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin

# Root index
/
  Cache-Control: public, max-age=3600, must-revalidate

# Service worker - no cache
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

# API responses (if proxied through CDN)
/api/*
  Cache-Control: no-store, no-cache, must-revalidate
```

**2. Nginx Configuration (Already in Dockerfile)**

The nginx config includes:
- Static assets: 1 year cache
- HTML: 1 hour cache with revalidation
- JSON/API: No cache
- Gzip compression for text content

**3. Cloudflare Page Rules**

Configure in Cloudflare dashboard:

| Rule | Pattern | Settings |
|------|---------|----------|
| Cache Everything | `example.com/assets/*` | Cache Level: Cache Everything, Edge Cache TTL: 1 month |
| Bypass API | `example.com/api/*` | Cache Level: Bypass |
| HTML Cache | `example.com/*.html` | Browser Cache TTL: 1 hour, Edge Cache TTL: 2 hours |

### CDN Security

#### WAF Rules (Cloudflare)

```bash
# Enable Cloudflare WAF managed rules
# Dashboard → Security → WAF → Managed rules

# Custom rules
# Block suspicious user agents
(http.user_agent contains "bot" and not cf.client.bot)

# Rate limiting
(http.request.uri.path eq "/api/submit") and 
(rate(5m) > 100)
```

#### DDoS Protection

- **L3/L4 Protection**: Automatic with Cloudflare/CloudFront
- **L7 Protection**: Enable "I'm Under Attack" mode in Cloudflare
- **Rate Limiting**: Configure per-path rate limits

### CDN Performance Optimization

#### 1. Image Optimization

```bash
# Use Cloudflare Polish for automatic image optimization
# Or implement responsive images

<img 
  src="/images/hero.jpg"
  srcset="/images/hero-320w.jpg 320w,
          /images/hero-640w.jpg 640w,
          /images/hero-1024w.jpg 1024w"
  sizes="(max-width: 640px) 320px,
         (max-width: 1024px) 640px,
         1024px"
  alt="Hero"
  loading="lazy"
/>
```

#### 2. Code Splitting

Already implemented in Vite config:
```javascript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      openpgp: ['openpgp'],
      // Add more chunks as needed
    },
  },
}
```

#### 3. HTTP/2 and HTTP/3

- Enable in Cloudflare: Dashboard → Network → HTTP/2 & HTTP/3
- Automatic with CloudFront for modern browsers

#### 4. Brotli Compression

```bash
# Enable in Cloudflare: Dashboard → Speed → Optimization → Brotli
# CloudFront: Automatically enabled
```

### CDN Invalidation

#### Cloudflare

```bash
# API-based purge
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Purge specific files
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://example.com/index.html"]}'
```

#### CloudFront

```bash
# AWS CLI invalidation
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

## Database Scaling

### Current Architecture

SafeVoice currently uses:
- **LocalStorage**: For client-side persistence
- **In-Memory Stores**: Crisis queue, theme settings, etc.
- **IPFS**: Decentralized storage for content
- **Blockchain**: For token transactions and governance

### Migration to Managed Database

#### Recommended: Supabase (PostgreSQL)

**Why Supabase:**
- PostgreSQL-based (battle-tested)
- Real-time subscriptions
- Built-in authentication
- Row-level security (RLS)
- PostgREST API
- Free tier available
- Excellent developer experience

**Setup:**

1. **Create Supabase Project**
   ```bash
   # Sign up at https://supabase.com
   # Create new project
   # Note connection details
   ```

2. **Schema Design**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  ipfs_cid TEXT,
  emotion_analysis JSONB,
  is_anonymous BOOLEAN DEFAULT false,
  community_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_community_id ON posts(community_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Crisis events table
CREATE TABLE crisis_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'expired')),
  metadata JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_crisis_events_status ON crisis_events(status);
CREATE INDEX idx_crisis_events_expires_at ON crisis_events(expires_at);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- Reactions table
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'support', 'heart')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, type)
);

CREATE INDEX idx_reactions_post_id ON reactions(post_id);
```

3. **Environment Configuration**

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. **Client Integration**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Alternative: Amazon RDS

**For Enterprise Scale:**

```bash
# Aurora PostgreSQL setup
aws rds create-db-cluster \
  --db-cluster-identifier safevoice-prod \
  --engine aurora-postgresql \
  --engine-version 14.6 \
  --master-username admin \
  --master-user-password "SecurePassword123!" \
  --database-name safevoice \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name safevoice-subnet-group

# Add read replicas
aws rds create-db-instance \
  --db-instance-identifier safevoice-read-replica-1 \
  --db-cluster-identifier safevoice-prod \
  --db-instance-class db.r6g.large \
  --engine aurora-postgresql
```

### Database Scaling Strategies

#### 1. Vertical Scaling

Increase instance size:
- **Supabase**: Upgrade plan (Starter → Pro → Enterprise)
- **RDS**: Modify instance class (db.t3.medium → db.r6g.xlarge)

#### 2. Horizontal Scaling (Read Replicas)

**Supabase:**
```bash
# Enable read replicas (Pro plan+)
# Configure in Supabase dashboard
```

**RDS Aurora:**
```bash
# Aurora automatically manages read replicas
# Add up to 15 replicas per cluster
```

**Connection Routing:**
```typescript
// src/lib/database.ts
import { Pool } from 'pg'

// Write connection
const writePool = new Pool({
  host: 'primary.db.safevoice.com',
  port: 5432,
  // ...
})

// Read connection pool (multiple replicas)
const readPool = new Pool({
  host: 'read.db.safevoice.com', // Read-only endpoint
  port: 5432,
  // ...
})

export const executeQuery = async (query: string, isWrite = false) => {
  const pool = isWrite ? writePool : readPool
  return await pool.query(query)
}
```

#### 3. Sharding

For massive scale (10M+ users):

**Strategy:**
- Shard by user_id (hash-based)
- Shard by geographic region
- Shard by community_id

**Example: User-based sharding**
```typescript
const getShardId = (userId: string): number => {
  const hash = crypto.createHash('md5').update(userId).digest('hex')
  return parseInt(hash.substring(0, 8), 16) % NUM_SHARDS
}

const getConnection = (userId: string) => {
  const shardId = getShardId(userId)
  return connectionPools[shardId]
}
```

#### 4. Caching Layer

**Redis for Hot Data:**

```typescript
// src/lib/redis.ts
import { createClient } from 'redis'

const redis = createClient({
  url: process.env.REDIS_URL,
})

// Cache frequently accessed data
export const getCachedPost = async (postId: string) => {
  const cached = await redis.get(`post:${postId}`)
  if (cached) return JSON.parse(cached)
  
  // Fetch from database
  const post = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()
  
  // Cache for 5 minutes
  await redis.setex(`post:${postId}`, 300, JSON.stringify(post.data))
  
  return post.data
}
```

**Cache Invalidation:**
```typescript
export const invalidatePostCache = async (postId: string) => {
  await redis.del(`post:${postId}`)
}
```

#### 5. Connection Pooling

**Supabase Pooler:**
```bash
# Use transaction mode for short-lived connections
DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.project.supabase.co:6543/postgres?pgbouncer=true

# Use session mode for long-lived connections
DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.project.supabase.co:5432/postgres
```

**PgBouncer Configuration:**
```ini
[databases]
safevoice = host=db.safevoice.com port=5432 dbname=safevoice

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
reserve_pool_size = 10
```

### Data Archival Strategy

**For Crisis Events:**

```sql
-- Archive table for historical data
CREATE TABLE crisis_events_archive (
  LIKE crisis_events INCLUDING ALL
);

-- Archive events older than 90 days
INSERT INTO crisis_events_archive
SELECT * FROM crisis_events
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM crisis_events
WHERE created_at < NOW() - INTERVAL '90 days';

-- Create view for unified access
CREATE VIEW crisis_events_all AS
SELECT * FROM crisis_events
UNION ALL
SELECT * FROM crisis_events_archive;
```

**Automated Archival:**
```sql
-- Create pg_cron job (Supabase)
SELECT cron.schedule(
  'archive-old-crisis-events',
  '0 2 * * *', -- 2 AM daily
  $$
  INSERT INTO crisis_events_archive
  SELECT * FROM crisis_events
  WHERE created_at < NOW() - INTERVAL '90 days'
  ON CONFLICT DO NOTHING;
  
  DELETE FROM crisis_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);
```

## Application Scaling

### Kubernetes Auto-Scaling

#### Horizontal Pod Autoscaler (HPA)

Already configured in `k8s/hpa.yaml`:
- Min replicas: 3
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

**Monitor HPA:**
```bash
# Watch HPA status
kubectl get hpa -n safevoice -w

# Describe HPA
kubectl describe hpa safevoice-frontend-hpa -n safevoice

# View metrics
kubectl top pods -n safevoice
```

#### Cluster Autoscaler

**AWS EKS:**
```bash
# Install cluster autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Configure IAM role
aws iam create-role \
  --role-name eks-cluster-autoscaler \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name eks-cluster-autoscaler \
  --policy-arn arn:aws:iam::aws:policy/AutoScalingFullAccess
```

**GKE:**
```bash
# Enable autoscaling on node pool
gcloud container clusters update safevoice-cluster \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=20 \
  --zone=us-central1-a
```

### Load Testing

**Prepare for scale:**

```bash
# Install k6
brew install k6

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
    http_req_failed: ['rate<0.01'],    // Error rate must be below 1%
  },
};

export default function () {
  let res = http.get('https://safevoice.example.com');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
```

## Monitoring & Alerting

### Metrics to Monitor

#### Application Metrics

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Response Time (p95) | Prometheus | > 500ms |
| Error Rate | Prometheus | > 1% |
| Request Rate | Prometheus | < 10% of peak (anomaly) |
| Memory Usage | Kubernetes | > 80% |
| CPU Usage | Kubernetes | > 70% |

#### Database Metrics

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Query Latency | Supabase/RDS | > 100ms (p95) |
| Connection Pool | PgBouncer | > 80% utilization |
| Replication Lag | RDS | > 30 seconds |
| Storage Usage | Supabase/RDS | > 80% capacity |
| Cache Hit Rate | Redis | < 90% |

#### CDN Metrics

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Cache Hit Rate | Cloudflare | < 85% |
| Bandwidth Usage | Cloudflare | Sudden spike (>200%) |
| Error Rate (4xx/5xx) | Cloudflare | > 2% |
| Geographic Latency | Cloudflare | > 200ms per region |

### Prometheus Setup

```yaml
# k8s/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: safevoice
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    
    scrape_configs:
      - job_name: 'safevoice-frontend'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - safevoice
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
```

### Grafana Dashboards

**Import Community Dashboards:**
- Kubernetes Cluster Overview: ID 7249
- NGINX Ingress Controller: ID 9614
- PostgreSQL Overview: ID 9628

**Custom Dashboard for SafeVoice:**

```json
{
  "dashboard": {
    "title": "SafeVoice Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{app='safevoice'}[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket{app='safevoice'})"
          }
        ]
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# k8s/alerting-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: safevoice-alerts
  namespace: safevoice
spec:
  groups:
    - name: safevoice
      interval: 30s
      rules:
        - alert: HighResponseTime
          expr: histogram_quantile(0.95, http_request_duration_seconds_bucket{app="safevoice"}) > 0.5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High response time detected"
            description: "p95 response time is {{ $value }}s"
        
        - alert: HighErrorRate
          expr: rate(http_requests_total{app="safevoice",status=~"5.."}[5m]) / rate(http_requests_total{app="safevoice"}[5m]) > 0.01
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "High error rate detected"
            description: "Error rate is {{ $value | humanizePercentage }}"
        
        - alert: PodCrashLooping
          expr: rate(kube_pod_container_status_restarts_total{namespace="safevoice"}[15m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod is crash looping"
            description: "Pod {{ $labels.pod }} is restarting"
```

## Cost Optimization

### Infrastructure Costs

**Current Estimated Costs (10K users):**

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| CDN | Cloudflare Free | $0 |
| Kubernetes | GKE Autopilot | $150 |
| Database | Supabase Pro | $25 |
| Object Storage | IPFS (local) | $0 |
| Monitoring | Grafana Cloud | $0 (free tier) |
| **Total** | | **$175** |

**Scaled Estimated Costs (100K users):**

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| CDN | Cloudflare Pro | $20 |
| Kubernetes | GKE/EKS | $500 |
| Database | Supabase Pro | $100 |
| Cache | Redis Cloud | $30 |
| Object Storage | IPFS + S3 | $50 |
| Monitoring | Grafana Cloud | $50 |
| **Total** | | **$750** |

### Cost-Saving Strategies

1. **Use Spot/Preemptible Instances**
   ```bash
   # GKE
   gcloud container node-pools create spot-pool \
     --cluster=safevoice-cluster \
     --spot \
     --num-nodes=3
   ```

2. **Right-Size Resources**
   - Monitor actual usage
   - Adjust requests/limits
   - Use VPA (Vertical Pod Autoscaler)

3. **Efficient Caching**
   - Cache at multiple layers
   - Use CDN effectively
   - Implement browser caching

4. **Database Optimization**
   - Archive old data
   - Optimize queries
   - Use read replicas efficiently

5. **Bandwidth Optimization**
   - Compress assets
   - Use WebP images
   - Implement lazy loading

## Disaster Recovery

### Backup Strategy

#### Database Backups

**Supabase:**
```bash
# Automatic daily backups (Pro plan)
# Point-in-time recovery (PITR)
# Retention: 7 days (Pro), 30 days (Enterprise)
```

**Manual Backups:**
```bash
# Export database
pg_dump -h db.project.supabase.co -U postgres -d postgres > backup.sql

# Restore
psql -h db.project.supabase.co -U postgres -d postgres < backup.sql
```

#### Application State

```bash
# Backup Kubernetes resources
kubectl get all -n safevoice -o yaml > k8s-backup.yaml

# Backup secrets (encrypted)
kubectl get secrets -n safevoice -o yaml | \
  kubeseal -o yaml > sealed-secrets.yaml
```

### Multi-Region Deployment

**Primary Region: us-central1**
**Secondary Region: europe-west1**

```yaml
# k8s/multi-region/geo-routing.yaml
apiVersion: v1
kind: Service
metadata:
  name: safevoice-global
  annotations:
    external-dns.alpha.kubernetes.io/hostname: safevoice.com
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  # Configure geo-routing at DNS level (Route53, Cloudflare)
```

### Recovery Time Objectives

| Scenario | RTO | RPO |
|----------|-----|-----|
| Pod failure | < 1 min | 0 (no data loss) |
| Node failure | < 5 min | 0 (no data loss) |
| AZ failure | < 10 min | < 1 min |
| Region failure | < 1 hour | < 5 min |
| Database failure | < 30 min | < 5 min |

### Incident Response Runbook

**1. Detect**
- Alert fires
- User reports
- Monitoring dashboard

**2. Assess**
```bash
# Check pod status
kubectl get pods -n safevoice

# Check logs
kubectl logs -f deployment/safevoice-frontend -n safevoice --tail=100

# Check metrics
kubectl top pods -n safevoice
```

**3. Mitigate**
```bash
# Scale up immediately
kubectl scale deployment safevoice-frontend --replicas=10 -n safevoice

# Rollback if needed
kubectl rollout undo deployment/safevoice-frontend -n safevoice

# Restart pods
kubectl rollout restart deployment/safevoice-frontend -n safevoice
```

**4. Resolve**
- Fix root cause
- Deploy fix
- Verify resolution
- Document incident

**5. Review**
- Post-mortem
- Update runbooks
- Implement improvements

## Summary Checklist

### Pre-Production

- [ ] CDN configured and tested
- [ ] Database migrated and scaled
- [ ] Load testing completed
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Security audit completed
- [ ] Cost optimization reviewed

### Production Launch

- [ ] DNS cutover planned
- [ ] Rollback plan ready
- [ ] Team trained on runbooks
- [ ] On-call rotation established
- [ ] Communication plan ready
- [ ] Performance baseline established

### Post-Launch

- [ ] Monitor metrics closely
- [ ] Review and adjust thresholds
- [ ] Optimize based on actual usage
- [ ] Regular backup testing
- [ ] Cost review monthly
- [ ] Security patches automated

## Additional Resources

- [Cloudflare Documentation](https://developers.cloudflare.com/)
- [Supabase Guides](https://supabase.com/docs)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Site Reliability Engineering Book](https://sre.google/books/)

## Support

For scaling-related questions:
- Infrastructure: DevOps team
- Database: DBA team
- Application: Engineering team
- Security: Security team

Emergency contacts in runbook.
