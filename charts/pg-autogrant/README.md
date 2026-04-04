# pg-autogrant

`pg-autogrant` runs a Kubernetes CronJob that reconciles PostgreSQL roles and grants.

## Files

- `values.yaml`: project-agnostic defaults. It intentionally configures no roles/databases/grants.
- `values.example.yaml`: fictional `acme-pay` example showing a complete setup.

## Default Behavior

With only `values.yaml`, the chart does not define any roles or grants:

- `roles: []`
- `databases: []`
- `crossGrants: []`
- `specificGrants: []`

This keeps defaults safe and reusable across projects.

## Quick Start

1. Copy and adapt the example values:

```bash
cp values.example.yaml my-values.yaml
```

2. Set your own secret name/keys in `credentialsSecret`.

3. Choose one connectivity mode:

- Cloud SQL Proxy sidecar: `cloudSqlProxy.enabled=true`
- Direct connection: `cloudSqlProxy.enabled=false` and configure `connection.*`

4. Install or upgrade:

```bash
helm upgrade --install pg-autogrant . -f my-values.yaml
```

## Grant Model

The chart applies grants in two phases:

1. Cluster-level (`grants.sql`):
- role creation
- database-level owner grants
- cross-role memberships
- database-level `specificGrants`

2. Per-database (`grants-<db>.sql`):
- schema/object/default privileges for each owner
- schema/object `specificGrants`

## Values Reference

### Core

- `schedule`: cron expression
- `activeDeadlineSeconds`: max runtime per Job
- `backoffLimit`: retries for failed Job
- `ttlSecondsAfterFinished`: cleanup TTL for completed Jobs

### Credentials

- `credentialsSecret.name`
- `credentialsSecret.userKey`
- `credentialsSecret.passwordKey`

### Connectivity

- `cloudSqlProxy.enabled`
- `cloudSqlProxy.instanceConnectionName`
- `connection.host`
- `connection.port`
- `connection.sslmode`

### Logging

- `logging.verboseSql`: when `true`, psql echoes SQL statements (`ECHO=queries`)

### Grants

- `roles[]`: roles to create
- `databases[]`: databases and owner role mapping
- `crossGrants[]`: role memberships
- `specificGrants[]`: explicit grants by `level` (`database`, `schema`, `object`)

## Testing

Run chart unit tests:

```bash
helm unittest .
```
