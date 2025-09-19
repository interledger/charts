# Rafiki Helm Chart

[![Helm Chart](https://img.shields.io/badge/Helm-Chart-blue)](https://github.com/interledger/rafiki)
[![Version](https://img.shields.io/badge/version-0.2.7-green)](https://github.com/interledger/rafiki)

## Overview

This Helm chart deploys [Rafiki](https://rafiki.dev), an open source software that provides an efficient solution for account servicing entities to enable Interledger functionality on their users' accounts. Rafiki enables sending and receiving payments via SPSP and Open Payments, and allows third-party access to initiate payments and view transaction data.

**⚠️ Important**: Rafiki is intended to be run by account servicing entities only and should not be used in production by non-regulated entities.

For more information about Rafiki, visit the [official documentation](https://rafiki.dev/overview/concepts/interledger/).

## Architecture
Rafiki consists of three main components that can be deployed independently:

- **Backend** (`rafiki-backend`): Core Interledger functionality, GraphQL Admin API, Open Payments API, and SPSP endpoint
- **Auth** (`rafiki-auth`): GNAP authorization server for Open Payments access control
- **Frontend** (`rafiki-frontend`): Web interface for managing Rafiki instances

## Secrets management

This chart has the capability of managing the secerets for you. But this is not recommended and for this reason `shouldCreateSecrets` will default to false. Consider using a formal secrets management solution to manage your secrets externally.

For non-production deployments you can set `shouldCreateSecrets` to `true` which will allow you to configure all the secrets as values in your custom values files.

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
   - Configure a Veritcal Pod Autoscaler

4. **Key Generation Failures**
   - Check ServiceAccount permissions if using auto-generation
   - Manually provide base64-encoded private key for production

### Getting Help

- [Official Rafiki Documentation](https://rafiki.dev)
- [GitHub Issues](https://github.com/interledger/rafiki/issues)
- [Community Calls](https://github.com/interledger/rafiki#community-calls)

## Values Reference

For a complete reference of all configuration options, see the [`values.yaml`](./values.yaml) file.

