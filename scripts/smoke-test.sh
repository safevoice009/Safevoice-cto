#!/bin/bash
# SafeVoice Smoke Test Script
# Tests Docker container and Kubernetes deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        exit 1
    fi
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

echo "========================================="
echo "SafeVoice Smoke Test Suite"
echo "========================================="
echo ""

# Test 1: Docker Build
print_info "Test 1: Building Docker image..."
docker build -t safevoice:test . > /dev/null 2>&1
print_status $? "Docker build successful"

# Test 2: Docker Run
print_info "Test 2: Starting Docker container..."
docker run -d --name safevoice-test -p 8888:80 safevoice:test > /dev/null 2>&1
sleep 5
print_status $? "Docker container started"

# Test 3: Health Check
print_info "Test 3: Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8888/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    print_status 0 "Health endpoint responding (HTTP 200)"
else
    print_status 1 "Health endpoint failed (HTTP $HEALTH_RESPONSE)"
fi

# Test 4: Main Page
print_info "Test 4: Checking main page..."
MAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8888/)
if [ "$MAIN_RESPONSE" = "200" ]; then
    print_status 0 "Main page responding (HTTP 200)"
else
    print_status 1 "Main page failed (HTTP $MAIN_RESPONSE)"
fi

# Test 5: Static Assets
print_info "Test 5: Checking static assets..."
ASSET_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8888/vite.svg)
if [ "$ASSET_RESPONSE" = "200" ]; then
    print_status 0 "Static assets accessible (HTTP 200)"
else
    print_status 1 "Static assets failed (HTTP $ASSET_RESPONSE)"
fi

# Test 6: Cache Headers
print_info "Test 6: Verifying cache headers..."
CACHE_HEADER=$(curl -s -I http://localhost:8888/vite.svg | grep -i "cache-control" | grep -i "public")
if [ -n "$CACHE_HEADER" ]; then
    print_status 0 "Cache headers configured correctly"
else
    print_status 1 "Cache headers missing or incorrect"
fi

# Test 7: Security Headers
print_info "Test 7: Checking security headers..."
SECURITY_HEADER=$(curl -s -I http://localhost:8888/ | grep -i "x-frame-options")
if [ -n "$SECURITY_HEADER" ]; then
    print_status 0 "Security headers present"
else
    print_status 1 "Security headers missing"
fi

# Cleanup
print_info "Cleaning up test container..."
docker stop safevoice-test > /dev/null 2>&1
docker rm safevoice-test > /dev/null 2>&1
docker rmi safevoice:test > /dev/null 2>&1
print_status 0 "Cleanup complete"

echo ""
echo "========================================="
echo -e "${GREEN}All tests passed!${NC}"
echo "========================================="
echo ""

# Optional: Test Kubernetes deployment if kubectl is available
if command -v kubectl &> /dev/null; then
    echo "========================================="
    echo "Kubernetes Validation (Optional)"
    echo "========================================="
    echo ""
    
    print_info "Validating Kubernetes manifests..."
    
    if command -v kubeval &> /dev/null; then
        kubeval k8s/*.yaml > /dev/null 2>&1
        print_status $? "Kubernetes manifests valid (kubeval)"
    else
        print_info "kubeval not installed, skipping manifest validation"
        print_info "Install with: brew install kubeval"
    fi
    
    print_info "Testing kubectl dry-run..."
    kubectl apply -f k8s/ --dry-run=client > /dev/null 2>&1
    print_status $? "kubectl dry-run successful"
    
    echo ""
fi

# Optional: Test docker-compose if available
if command -v docker-compose &> /dev/null || command -v docker compose &> /dev/null; then
    echo "========================================="
    echo "Docker Compose Test (Optional)"
    echo "========================================="
    echo ""
    
    print_info "Starting docker-compose..."
    docker compose up -d > /dev/null 2>&1 || docker-compose up -d > /dev/null 2>&1
    sleep 10
    
    print_info "Checking docker-compose health..."
    COMPOSE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
    if [ "$COMPOSE_HEALTH" = "200" ]; then
        print_status 0 "Docker Compose deployment healthy"
    else
        print_status 1 "Docker Compose deployment failed"
    fi
    
    print_info "Stopping docker-compose..."
    docker compose down > /dev/null 2>&1 || docker-compose down > /dev/null 2>&1
    print_status 0 "Docker Compose cleanup complete"
    
    echo ""
fi

echo "========================================="
echo "Summary:"
echo "  - Docker build: ✓"
echo "  - Container health: ✓"
echo "  - HTTP endpoints: ✓"
echo "  - Cache headers: ✓"
echo "  - Security headers: ✓"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Deploy to staging: kubectl apply -k k8s/"
echo "  2. Run load tests: k6 run load-test.js"
echo "  3. Monitor metrics: kubectl top pods -n safevoice"
echo ""
