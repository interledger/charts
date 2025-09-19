# Rafiki Helm Chart

[![Helm Chart](https://img.shields.io/badge/Helm-Chart-blue)](https://github.com/interledger/rafiki)
[![Version](https://img.shields.io/badge/version-0.2.7-green)](https://github.com/interledger/rafiki)

## Overview

This Helm chart deploys [Rafiki](https://rafiki.dev), an open source software that provides an efficient solution for account servicing entities to enable Interledger functionality on their users' accounts. Rafiki enables sending and receiving payments via SPSP and Open Payments, and allows third-party access to initiate payments and view transaction data.

**⚠️ Important**: Rafiki is intended to be run by account servicing entities only and should not be used in production by non-regulated entities.

### Key Features

- **Interledger Payments**: Send and receive payments using SPSP and Open Payments
- **Third-Party Access**: Allow authorized third parties to initiate payments and access transaction data
- **Admin APIs**: Manage peering relationships, assets, and wallet addresses
- **Authorization Server**: Reference implementation of GNAP authorization server
- **High Performance**: Built for production workloads with horizontal scaling support

For more information about Rafiki, visit the [official documentation](https://rafiki.dev/overview/concepts/interledger/).

## Architecture

Rafiki consists of three main components that can be deployed independently:

- **Backend** (`rafiki-backend`): Core Interledger functionality, GraphQL Admin API, Open Payments API, and SPSP endpoint
- **Auth** (`rafiki-auth`): GNAP authorization server for Open Payments access control
- **Frontend** (`rafiki-frontend`): Web interface for managing Rafiki instances

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- PostgreSQL database (not included in chart)
- Redis instance (not included in chart)
- TLS certificates for production deployments

## Quick Start

### 1. Add the Helm Repository

```bash
helm repo add interledger https://interledger.github.io/charts/interledger
helm repo update
```

### 2. Create Required Secrets

Since the chart has `shouldCreateSecrets: false` by default, you must create the necessary secrets manually:

```bash
# Create auth secrets
kubectl create secret generic rafiki-auth \
  --from-literal=AUTH_DATABASE_URL="postgresql://user:password@postgres:5432/auth_db" \
  --from-literal=REDIS_URL="redis://redis:6379" \
  --from-literal=COOKIE_KEY="your-cookie-key-here" \
  --from-literal=IDENTITY_SERVER_SECRET="your-identity-server-secret"

# Create backend secrets  
kubectl create secret generic rafiki-backend \
  --from-literal=DATABASE_URL="postgresql://user:password@postgres:5432/backend_db" \
  --from-literal=REDIS_URL="redis://redis:6379" \
  --from-literal=STREAM_SECRET="your-stream-secret" \
  --from-literal=SIGNATURE_SECRET="your-webhook-signature-secret"
```

### 3. Install the Chart

```bash
helm install my-rafiki interledger/rafiki \
  --set config.backend.instanceName="my-rafiki-instance" \
  --set config.backend.ilp.address="test.my-rafiki" \
  --set config.backend.key.id="my-unique-key-id"
```

## Configuration

### Required Configuration

The following values must be configured for a production deployment:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `config.backend.instanceName` | Unique name for your Rafiki instance | `"production-rafiki"` |
| `config.backend.ilp.address` | ILP address of your instance | `"g.bank.my-rafiki"` |
| `config.backend.key.id` | Unique key identifier | `"bank-key-2024"` |
| `config.backend.ilp.host` | Public endpoint URL | `"https://rafiki.bank.com"` |

### Database Configuration

Rafiki requires PostgreSQL databases for both auth and backend services:

```yaml
config:
  auth:
    databaseUrl:
      secretKeyRef:
        key: AUTH_DATABASE_URL
        name: rafiki-auth
  backend:
    databaseUrl:
      secretKeyRef:
        key: DATABASE_URL
        name: rafiki-backend
```

### Redis Configuration

Redis is used for caching and session management:

```yaml
config:
  auth:
    redisUrl:
      secretKeyRef:
        key: REDIS_URL
        name: rafiki-auth
  backend:
    redisUrl:
      secretKeyRef:
        key: REDIS_URL
        name: rafiki-backend
```

### Ingress Configuration

To expose Rafiki services externally, configure ingress:

```yaml
ingress:
  backend:
    enabled: true
    className: nginx
    hosts:
      - host: rafiki.example.com
        paths:
          - path: /
            pathType: Prefix
  auth:
    enabled: true
    className: nginx
    hosts:
      - host: auth.example.com
        paths:
          - path: /
            pathType: Prefix
  frontend:
    enabled: true
    className: nginx
    hosts:
      - host: admin.example.com
        paths:
          - path: /
            pathType: Prefix
```

## Secret Management

### Using Chart-Generated Secrets (Development Only)

For development environments, you can enable automatic secret creation:

```yaml
config:
  auth:
    shouldCreateSecrets: true
    redisUrl:
      value: "redis://redis:6379"
    databaseUrl:
      value: "postgresql://user:pass@postgres:5432/auth"
    cookieKey:
      value: "development-cookie-key"
    identityServer:
      serverSecret:
        value: "development-identity-secret"

  backend:
    shouldCreateSecrets: true
    redisUrl:
      value: "redis://redis:6379"
    databaseUrl:
      value: "postgresql://user:pass@postgres:5432/backend"
    ilp:
      streamSecret:
        value: "development-stream-secret"
    webhookSignatureSecret:
      value: "development-webhook-secret"
```

### Production Secret Management

For production, create secrets externally and reference them:

```yaml
config:
  auth:
    shouldCreateSecrets: false
    databaseUrl:
      secretKeyRef:
        key: DATABASE_URL
        name: rafiki-auth-secrets
    # ... other secret references

  backend:
    shouldCreateSecrets: false
    databaseUrl:
      secretKeyRef:
        key: DATABASE_URL
        name: rafiki-backend-secrets
    # ... other secret references
```

Required secrets for production:

#### Auth Service Secrets
- `AUTH_DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `COOKIE_KEY`: Key for signing session cookies
- `IDENTITY_SERVER_SECRET`: Shared secret with identity provider

#### Backend Service Secrets  
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `STREAM_SECRET`: Secret for STREAM protocol
- `SIGNATURE_SECRET`: Secret for webhook signatures

### Private Key Management

Rafiki requires an Ed25519 private key for signing. You can either:

1. **Generate automatically** (development):
```yaml
config:
  backend:
    key:
      pvk: ''  # Empty string triggers auto-generation
```

2. **Provide your own key** (production):
```bash
# Generate key
openssl genpkey -algorithm Ed25519 -out private.pem

# Encode for values file
echo -n "$(cat private.pem)" | base64 -w0

# Use in values.yaml
config:
  backend:
    key:
      pvk: 'LS0tLS1CRUdJTi...' # base64 encoded private key
```

## Scaling and Resources

### Performance Characteristics

- **Node.js Architecture**: Each process consumes a single CPU core
- **Horizontal Scaling**: Auth and Frontend services support horizontal scaling
- **Backend Limitations**: Backend service does not support horizontal scaling due to locking constraints

### Resource Recommendations

```yaml
deployments:
  backend:
    resources:
      requests:
        memory: 512Mi
        cpu: 1000m
      limits:
        memory: 2048Mi
        cpu: 1000m
    replicaCount: 1  # Cannot be increased

  auth:
    resources:
      requests:
        memory: 256Mi
        cpu: 500m
      limits:
        memory: 1024Mi
        cpu: 1000m
    replicaCount: 2  # Can be scaled

  frontend:
    resources:
      requests:
        memory: 128Mi
        cpu: 100m
      limits:
        memory: 512Mi
        cpu: 500m
    replicaCount: 2  # Can be scaled
```

### Autoscaling

Enable Horizontal Pod Autoscaling for auth service:

```yaml
deployments:
  auth:
    autoscaling:
      enabled: true
      minReplicas: 2
      maxReplicas: 10
      targetCPUUtilizationPercentage: 70
```

## Examples

### Backend-Only Deployment

Deploy only the backend service for API-only usage:

```yaml
deployments:
  auth:
    enabled: false
  frontend:
    enabled: false
  backend:
    enabled: true

config:
  backend:
    shouldCreateSecrets: true
    # ... backend configuration
```

### Multi-Environment Setup

Different configurations per environment:

```yaml
# development values
config:
  backend:
    nodeEnv: development
    logLevel: debug
  auth:
    nodeEnv: development
    logLevel: debug

# production values
config:
  backend:
    nodeEnv: production
    logLevel: info
  auth:
    nodeEnv: production
    logLevel: warn
```

## Monitoring and Observability

### Health Checks

All services include health check endpoints:

- Backend: `http://backend:3000/healthz`
- Auth: `http://auth:3007/healthz`

### Logging

Configure log levels per environment:

```yaml
config:
  backend:
    logLevel: info  # error, warn, info, debug
  auth:
    logLevel: info
  frontend:
    logLevel: info
```

### Telemetry

Enable telemetry for production monitoring:

```yaml
config:
  backend:
    telemetry:
      enabled: true
      livenet: true  # Set to true for production networks
```

## Troubleshooting

### Common Issues

1. **Secret Not Found Errors**
   - Ensure all required secrets are created before installing
   - Check secret names match the configuration

2. **Database Connection Failures**
   - Verify database URLs are correct
   - Ensure databases exist and are accessible

3. **Backend Won't Scale**
   - Backend service has locking limitations and cannot be horizontally scaled
   - Scale auth and frontend services instead

4. **Key Generation Failures**
   - Check ServiceAccount permissions if using auto-generation
   - Manually provide base64-encoded private key for production

### Getting Help

- [Official Rafiki Documentation](https://rafiki.dev)
- [GitHub Issues](https://github.com/interledger/rafiki/issues)
- [Community Calls](https://github.com/interledger/rafiki#community-calls)

## Values Reference

For a complete reference of all configuration options, see the [`values.yaml`](./values.yaml) file.

## Contributing

Please read the [contribution guidelines](https://github.com/interledger/rafiki/blob/main/.github/contributing.md) before submitting contributions.
