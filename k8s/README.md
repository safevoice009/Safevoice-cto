# SafeVoice Kubernetes Manifests

This directory contains Kubernetes manifests for deploying SafeVoice to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (v1.23+)
- `kubectl` CLI tool installed and configured
- NGINX Ingress Controller installed (for ingress support)
- Metrics Server installed (for HPA support)
- Container registry access (GHCR or equivalent)

## Manifests Overview

| File | Description |
|------|-------------|
| `namespace.yaml` | Creates the `safevoice` namespace |
| `configmap.yaml` | Application configuration (non-sensitive) |
| `secret.yaml` | Sensitive configuration (API keys, tokens) |
| `deployment.yaml` | Frontend application deployment (3 replicas) |
| `service.yaml` | ClusterIP service for the frontend |
| `ingress.yaml` | Ingress resource for external access |
| `hpa.yaml` | Horizontal Pod Autoscaler (scales 3-10 replicas) |
| `kustomization.yaml` | Kustomize configuration for resource management |

## Quick Start

### 1. Update Configuration

Before deploying, update the following files with your environment-specific values:

**secret.yaml:**
```yaml
VITE_WALLETCONNECT_PROJECT_ID: "your_actual_project_id"
# Add other secrets as needed
```

**ingress.yaml:**
```yaml
- host: your-domain.com  # Replace with your actual domain
```

**deployment.yaml:**
```yaml
image: ghcr.io/your-org/safevoice:v1.0.0  # Update with your image registry
```

### 2. Deploy Using kubectl

```bash
# Apply all manifests
kubectl apply -k .

# Or apply individually
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
```

### 3. Verify Deployment

```bash
# Check all resources in the namespace
kubectl get all -n safevoice

# Check deployment status
kubectl rollout status deployment/safevoice-frontend -n safevoice

# Check pods
kubectl get pods -n safevoice

# Check pod logs
kubectl logs -f deployment/safevoice-frontend -n safevoice

# Check HPA status
kubectl get hpa -n safevoice
```

### 4. Access the Application

```bash
# Get ingress details
kubectl get ingress -n safevoice

# If using port-forwarding for testing
kubectl port-forward svc/safevoice-frontend 8080:80 -n safevoice
# Then access at http://localhost:8080
```

## Production Deployment Checklist

### Pre-deployment

- [ ] Update `secret.yaml` with actual values (or use external secret management)
- [ ] Configure TLS certificates in `ingress.yaml`
- [ ] Update domain in `ingress.yaml`
- [ ] Review and adjust resource limits in `deployment.yaml`
- [ ] Configure HPA thresholds based on load testing
- [ ] Set up monitoring and alerting

### Security

- [ ] Use external secret management (e.g., Sealed Secrets, Vault)
- [ ] Enable Pod Security Standards
- [ ] Configure Network Policies
- [ ] Review and harden RBAC permissions
- [ ] Enable audit logging

### Scaling

- [ ] Configure HPA based on traffic patterns
- [ ] Set up cluster autoscaling (if using cloud provider)
- [ ] Configure resource requests/limits appropriately
- [ ] Test scaling under load

## Rolling Updates

To deploy a new version:

```bash
# Update the image tag in deployment.yaml or use kustomize
kubectl set image deployment/safevoice-frontend \
  safevoice=ghcr.io/safevoice009/safevoice:v1.1.0 \
  -n safevoice

# Watch the rollout
kubectl rollout status deployment/safevoice-frontend -n safevoice

# Rollback if needed
kubectl rollout undo deployment/safevoice-frontend -n safevoice
```

## Environment-Specific Overlays

For managing multiple environments (dev, staging, prod), create kustomize overlays:

```bash
k8s/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── production/
        └── kustomization.yaml
```

Deploy to specific environment:
```bash
kubectl apply -k overlays/production
```

## Troubleshooting

### Pods not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n safevoice

# Check logs
kubectl logs <pod-name> -n safevoice

# Check resource constraints
kubectl top pods -n safevoice
```

### Ingress not working

```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify ingress configuration
kubectl describe ingress safevoice-ingress -n safevoice

# Check service endpoints
kubectl get endpoints safevoice-frontend -n safevoice
```

### HPA not scaling

```bash
# Check metrics server
kubectl top nodes
kubectl top pods -n safevoice

# Check HPA status
kubectl describe hpa safevoice-frontend-hpa -n safevoice

# Verify metrics are available
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
```

## Health Checks

The application exposes a `/health` endpoint for health checks:

```bash
# Test health endpoint
kubectl exec -it deployment/safevoice-frontend -n safevoice -- wget -qO- http://localhost/health
```

## Monitoring Integration

The deployment includes annotations for Prometheus scraping:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "80"
  prometheus.io/path: "/health"
```

## Clean Up

To remove all resources:

```bash
# Delete using kustomize
kubectl delete -k .

# Or delete namespace (removes all resources)
kubectl delete namespace safevoice
```

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)

## Support

For issues or questions, please refer to the main project documentation or open an issue.
