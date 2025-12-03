# SafeVoice Container Guide

This guide covers building, running, and deploying SafeVoice using Docker containers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Build](#docker-build)
- [Local Development](#local-development)
- [Docker Compose](#docker-compose)
- [Environment Variables](#environment-variables)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Prerequisites

- Docker 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose v2.0+ (included with Docker Desktop)
- Git
- 4GB+ RAM available for Docker
- Basic understanding of containers and Docker

## Docker Build

### Multi-Stage Build Process

The SafeVoice Dockerfile uses a multi-stage build for optimal image size and security:

1. **Builder Stage** (node:20-alpine)
   - Installs Node.js dependencies
   - Compiles TypeScript
   - Builds production assets with Vite
   
2. **Production Stage** (nginx:alpine)
   - Copies built assets from builder
   - Configures nginx for SPA routing
   - Sets up security headers and caching
   - Minimal attack surface (~50MB final image)

### Building the Image

#### Basic Build

```bash
# Build with default settings
docker build -t safevoice:latest .

# Build with specific tag
docker build -t safevoice:v1.0.0 .
```

#### Build with Arguments

```bash
# Build with WalletConnect project ID
docker build \
  --build-arg VITE_WALLETCONNECT_PROJECT_ID=your_project_id \
  --build-arg VITE_APP_ENV=production \
  --build-arg PUBLIC_URL=/ \
  -t safevoice:latest .
```

#### Build for Multiple Platforms

```bash
# Build for AMD64 and ARM64
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t safevoice:latest \
  --push .
```

### Image Verification

```bash
# Check image size
docker images safevoice:latest

# Inspect image layers
docker history safevoice:latest

# Scan for vulnerabilities
docker scan safevoice:latest

# Run security checks
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image safevoice:latest
```

## Local Development

### Quick Start

```bash
# Run the container
docker run -d \
  --name safevoice \
  -p 8080:80 \
  safevoice:latest

# Access the application
open http://localhost:8080

# View logs
docker logs -f safevoice

# Stop the container
docker stop safevoice

# Remove the container
docker rm safevoice
```

### Running with Environment Variables

```bash
docker run -d \
  --name safevoice \
  -p 8080:80 \
  -e VITE_APP_ENV=development \
  -e VITE_ENABLE_DEBUG=true \
  safevoice:latest
```

### Running with .env File

```bash
# Create .env file
cat > .env.docker << EOF
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_APP_ENV=development
PORT=8080
EOF

# Run with env file
docker run -d \
  --name safevoice \
  -p 8080:80 \
  --env-file .env.docker \
  safevoice:latest
```

## Docker Compose

Docker Compose simplifies container management and is ideal for local development.

### Starting the Application

```bash
# Start in detached mode
docker compose up -d

# Start with build
docker compose up --build -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f safevoice-app
```

### Stopping the Application

```bash
# Stop containers
docker compose stop

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes
docker compose down -v
```

### Configuration

The `docker-compose.yml` file includes:

- **Service**: `safevoice-app`
- **Port Mapping**: `${PORT:-8080}:80`
- **Health Checks**: Automatic health monitoring
- **Restart Policy**: `unless-stopped`
- **Networks**: Isolated `safevoice-network`

### Customizing Port

```bash
# Use custom port
PORT=3000 docker compose up -d

# Or set in .env file
echo "PORT=3000" >> .env
docker compose up -d
```

## Environment Variables

### Build-Time Variables

These variables are set during the Docker build process:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | - |
| `VITE_APP_ENV` | Application environment | `production` |
| `PUBLIC_URL` | Base URL for assets | `/` |

### Runtime Variables

These variables can be set when running the container:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to expose (docker-compose only) | `8080` |

### Setting Variables

**For Docker Build:**
```bash
docker build --build-arg VITE_WALLETCONNECT_PROJECT_ID=xyz .
```

**For Docker Run:**
```bash
docker run -e VITE_APP_ENV=production safevoice:latest
```

**For Docker Compose:**
```bash
# .env file
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
PORT=8080
```

## Production Deployment

### Container Registry

#### GitHub Container Registry (GHCR)

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag image
docker tag safevoice:latest ghcr.io/safevoice009/safevoice:latest

# Push image
docker push ghcr.io/safevoice009/safevoice:latest

# Pull image
docker pull ghcr.io/safevoice009/safevoice:latest
```

#### Docker Hub

```bash
# Login
docker login

# Tag and push
docker tag safevoice:latest username/safevoice:latest
docker push username/safevoice:latest
```

### Production Run Configuration

```bash
docker run -d \
  --name safevoice-prod \
  --restart always \
  -p 80:80 \
  --memory="256m" \
  --cpus="0.5" \
  --health-cmd="curl -f http://localhost/health || exit 1" \
  --health-interval=30s \
  --health-timeout=3s \
  --health-retries=3 \
  -e VITE_APP_ENV=production \
  ghcr.io/safevoice009/safevoice:latest
```

### Docker Swarm (Optional)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml safevoice

# List services
docker service ls

# Scale service
docker service scale safevoice_safevoice-app=3

# Remove stack
docker stack rm safevoice
```

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker logs safevoice

# Check container status
docker inspect safevoice

# Try running interactively
docker run -it --rm safevoice:latest sh
```

### Build Failures

```bash
# Clear build cache
docker builder prune -a

# Build with no cache
docker build --no-cache -t safevoice:latest .

# Check build arguments
docker build --build-arg VITE_APP_ENV=production -t safevoice:latest .
```

### Network Issues

```bash
# Check network connectivity
docker exec safevoice curl -I https://google.com

# Inspect network
docker network inspect safevoice-network

# Recreate network
docker compose down
docker compose up -d
```

### Performance Issues

```bash
# Check resource usage
docker stats safevoice

# Increase memory limit
docker run --memory="512m" safevoice:latest

# Check system resources
docker system df
```

### Health Check Failures

```bash
# Test health endpoint
docker exec safevoice curl http://localhost/health

# Check health status
docker inspect --format='{{json .State.Health}}' safevoice | jq

# View health check logs
docker inspect safevoice | jq '.[0].State.Health'
```

## Best Practices

### Security

1. **Don't Run as Root**
   - The container runs as nginx user (UID 101)
   - Read-only root filesystem
   - Dropped capabilities

2. **Use Multi-Stage Builds**
   - Reduces attack surface
   - Smaller image size
   - No build dependencies in production

3. **Scan Images Regularly**
   ```bash
   docker scan safevoice:latest
   trivy image safevoice:latest
   ```

4. **Use Specific Tags**
   - Avoid `latest` in production
   - Use semantic versioning (v1.0.0)
   - Include commit SHA for traceability

### Performance

1. **Layer Caching**
   - Order Dockerfile commands by change frequency
   - Copy package.json before source code
   - Use `.dockerignore`

2. **Image Size**
   - Use alpine base images
   - Remove unnecessary files
   - Combine RUN commands
   - Use multi-stage builds

3. **Resource Limits**
   ```bash
   docker run --memory="256m" --cpus="0.5" safevoice:latest
   ```

### Maintenance

1. **Clean Up Regularly**
   ```bash
   # Remove unused images
   docker image prune -a
   
   # Remove unused containers
   docker container prune
   
   # Remove unused volumes
   docker volume prune
   
   # Complete cleanup
   docker system prune -a --volumes
   ```

2. **Monitor Logs**
   ```bash
   # Follow logs
   docker compose logs -f
   
   # Export logs
   docker logs safevoice > logs.txt
   ```

3. **Update Base Images**
   ```bash
   # Pull latest base images
   docker pull node:20-alpine
   docker pull nginx:alpine
   
   # Rebuild
   docker compose build --pull
   ```

### Development Workflow

1. **Local Testing**
   ```bash
   # Build locally
   docker compose build
   
   # Test
   docker compose up -d
   curl http://localhost:8080/health
   
   # Clean up
   docker compose down
   ```

2. **CI/CD Integration**
   - Automated builds on push to main
   - Vulnerability scanning
   - Automated tagging
   - SBOM generation

3. **Version Management**
   ```bash
   # Tag with version
   git tag v1.0.0
   git push origin v1.0.0
   
   # CI automatically builds and tags
   # ghcr.io/safevoice009/safevoice:v1.0.0
   ```

## Additional Resources

- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Kubernetes Deployment Guide](../k8s/README.md)
- [Scaling Playbook](./SCALING_PLAYBOOK.md)

## Support

For container-related issues:

1. Check logs: `docker logs safevoice`
2. Verify health: `docker exec safevoice curl http://localhost/health`
3. Review configuration: `docker inspect safevoice`
4. Consult the [Troubleshooting](#troubleshooting) section
5. Open an issue on GitHub with logs and configuration

## Next Steps

- Deploy to Kubernetes: See [k8s/README.md](../../k8s/README.md)
- Configure CDN: See [SCALING_PLAYBOOK.md](./SCALING_PLAYBOOK.md)
- Set up monitoring: Integrate with Prometheus/Grafana
- Implement CI/CD: Use GitHub Actions workflow
