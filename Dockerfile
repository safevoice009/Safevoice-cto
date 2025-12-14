# Multi-stage Dockerfile for SafeVoice
# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies required for the Vite/TypeScript build)
# `--no-audit`/`--no-fund` avoids extra network calls that can make Docker builds flaky.
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build arguments
ARG VITE_WALLETCONNECT_PROJECT_ID
ARG VITE_APP_ENV=production
ARG PUBLIC_URL=/

# Set environment variables for build
ENV VITE_WALLETCONNECT_PROJECT_ID=${VITE_WALLETCONNECT_PROJECT_ID}
ENV VITE_APP_ENV=${VITE_APP_ENV}
ENV PUBLIC_URL=${PUBLIC_URL}

# Build the application
RUN npm run build

# Stage 2: Production server with nginx
FROM nginx:alpine

# Note: nginx:alpine already includes busybox (with wget), so we avoid extra package installs
# to reduce flakiness from Alpine package mirrors during image build.

# Copy custom nginx configuration
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Cache control for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API/JSON files - no cache
    location ~* \.(json)$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
    
    # HTML files - short cache
    location ~* \.(html)$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # Single Page Application routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json image/svg+xml;
}
EOF

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health >/dev/null 2>&1 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
