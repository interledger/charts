# Web Monetization Tools

This Helm chart deploys the Web Monetization Tools application, which consists of a backend and frontend component. This chart consolidates the previously separate backend and frontend charts into a unified deployment following the Interledger Foundation's Helm chart patterns.

## Features

- **Backend Service**: Node.js backend API that integrates with AWS S3 for configuration management
- **Frontend Service**: React-based frontend application for the Web Monetization Tools interface
- **Unified Configuration**: Single chart that manages both components with shared configuration patterns
- **Secret Management**: Automated secret creation for sensitive values like AWS credentials
- **Testing**: Comprehensive unit tests using Helm's testing framework

## Architecture

The chart deploys:

- Backend deployment running on port 5101
- Frontend deployment running on port 3000
- Kubernetes services for both components
- ConfigMaps for environment-specific configuration
- Secrets for sensitive data (AWS credentials)

## Configuration

### Backend Configuration

The backend service includes:

- AWS S3 integration for configuration storage
- Configurable retry mechanisms
- Environment-specific logging levels
- Resource limits and requests

### Frontend Configuration

The frontend service includes:

- API URL configuration pointing to the backend
- Interledger Pay integration URL
- Environment-specific build settings
- Resource limits and requests

## Values

Key configuration values include:

```yaml
config:
  backend:
    shouldCreateSecrets: true  # Whether to create Kubernetes secrets
    aws:
      accessKeyId: "AKIAIOSFODNN7EXAMPLE"  # Replace with actual AWS access key
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"  # Replace with actual secret
      region: "us-east-1"
      bucketName: "your-bucket-name"
      # ... other AWS settings
  frontend:
    urls:
      api: "https://your-backend-domain.example.com/"
      frontend: "https://your-frontend-domain.example.com/"
      interledgerPay: "https://interledgerpay.com/extension/"
```

## Security Considerations

**⚠️ Important**: This chart includes placeholder values for AWS credentials and URLs. Before deploying:

1. **Replace all placeholder values** with actual credentials and URLs
2. **Never commit real credentials** to version control
3. **Use Kubernetes secrets** or external secret management (like OnePassword) for sensitive data
4. **Review all configuration values** before deployment

## Installation

```bash
# First, update values.yaml with your actual configuration
helm install web-monetization-tools ./web-monetization-tools
```

## Testing

Run the included unit tests:

```bash
helm unittest web-monetization-tools
```

## Migration from Legacy Charts

This chart replaces the separate `web-monetization-tools-backend` and `web-monetization-tools-frontend` charts. When migrating:

1. Update your ArgoCD ApplicationSets to point to the new chart
2. Review and migrate any custom values from the old charts
3. Update any external references to use the new unified service naming convention
4. Create separate ingress manifests in your deployment configuration as needed

## Dependencies

This chart depends on the `common` Helm library (v0.8.0) which provides shared templates and utilities used across Interledger Foundation charts.
