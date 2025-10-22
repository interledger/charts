# Rafiki Boutique Chart Consolidation - README

## Overview
This consolidated chart combines the previously separate `rafiki-boutique-backend` and `rafiki-boutique-frontend` charts into a single, unified `rafiki-boutique` chart, following the same patterns established with the main Rafiki application consolidation.

## Chart Structure

### Components
- **Backend**: Test boutique backend application (port 3004)
- **Frontend**: Test boutique frontend application (port 4004)

### Key Features
- Uses common library v0.6.0 for template abstraction
- Comprehensive configuration management through values.yaml
- Conditional secret creation via `shouldCreateSecrets` flag
- Full ingress support for both components
- Separate services and deployments for frontend and backend

### Configuration

#### Backend Configuration
- Database connection configuration
- Private key management
- Payment pointer and key ID settings
- Frontend URL configuration

#### Frontend Configuration
- API base URL configuration
- Port configuration

## Testing
The chart includes comprehensive unit tests covering:
- Deployment creation and configuration
- Service creation and port mapping
- Ingress creation and routing
- Secret creation (conditional)
- ConfigMap population with correct environment variables

## Usage
```bash
# Install dependencies
helm dependency update

# Run tests
helm unittest .

# Deploy
helm install my-boutique . -f my-values.yaml
```

## Migration from Separate Charts
This chart replaces:
- `rafiki-boutique-backend` (v0.1.11)
- `rafiki-boutique-frontend` (v0.1.16)

All functionality from both charts has been preserved and consolidated into this single chart.
