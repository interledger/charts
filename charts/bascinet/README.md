# Bascinet chart

Bascinet is a general-purpose Helm chart. Use it to deploy a simple
application to a cluster. You write one values file. You do not write
any Helm templates.

This chart gives consistency across simple deployments. Every team that
uses Bascinet gets the same Deployment, ConfigMap, and Service shape.

Bascinet builds on the [common chart library](../common). The common
library provides the underlying templates.

## Components

Bascinet can deploy up to four components. Each component is
independent. Enable only the components your application needs.

| Component  | Enabled by default | Creates a Service |
|------------|---------------------|--------------------|
| `backend`  | Yes                 | Yes                |
| `frontend` | No                  | Yes                |
| `api`      | No                  | Yes                |
| `worker`   | No                  | No                 |

A `worker` component has no Service. A worker does not receive
network traffic.

When you enable a component, the chart creates:
- One `Deployment`
- One `ConfigMap`
- One `Service` (except for `worker`)

When you disable a component, the chart creates none of these
resources for it.

## How to use this chart

1. Add the Interledger Helm repository.
   ```
   helm repo add interledger-helm https://interledger.github.io/charts/interledger
   helm repo update
   ```
2. Create a values file for your application. Name it something like
   `myapp-values.yaml`.
3. In the values file, enable the components you need and set their
   `image`. Every other field has a working default.
   ```yaml
   api:
     enabled: true
     image:
       repository: ghcr.io/interledger/myapp
       name: api
       tag: 1.0.0
   ```
4. Install the chart with your values file.
   ```
   helm install myapp interledger-helm/bascinet -f myapp-values.yaml
   ```

## Configuration reference

Each component (`backend`, `frontend`, `api`, `worker`) accepts the
same fields.

| Field | Purpose |
|-------|---------|
| `enabled` | Turns the component's Deployment, ConfigMap, and Service on or off. |
| `name` | Name suffix for the component's resources. |
| `replicaCount` | Number of pod replicas. |
| `image.repository` | Container image repository. |
| `image.name` | Container image name. |
| `image.tag` | Container image tag. |
| `ports` | Container ports the pod exposes. |
| `resources` | CPU and memory requests and limits. |
| `config` | Plain key-value pairs. The chart writes these into the component's ConfigMap. |
| `envFrom` | Sources for environment variables, such as the component's own ConfigMap. |
| `service` | Service type, ports, and annotations. Not used by `worker`. |
| `serviceAccount` | Service account settings for the pod. |

The chart names each generated resource
`<release-name>-<chart-name>-<component-name>`. For example, a release
named `myapp` produces a ConfigMap named `myapp-bascinet-api`.

Override `image.repository`, `image.name`, and `image.tag`
independently for each component. Each component keeps its own image
settings.

## Secrets

This chart does not create or manage secrets.

Create secrets through Vault or 1Password. Create them outside this
chart. Then connect the secret to your deployment in one of two ways.

**Option 1: Add the secret to environment variables.**

Reference the secret under the component's `envFrom` field.

```yaml
backend:
  envFrom:
    - configMapRef:
        name: "{{ include \"common.fullname\" . }}-backend"
    - secretRef:
        name: my-external-secret
```

**Option 2: Mount the secret as a file.**

Reference the secret under the component's `volumes` and
`volumeMounts` fields.

```yaml
backend:
  volumes:
    - name: my-secret
      secret:
        secretName: my-external-secret
  volumeMounts:
    - name: my-secret
      mountPath: /etc/secrets/my-secret
      readOnly: true
```

If your secret comes from a CSI secret store, such as the Vault CSI
provider, use the `secretProvider` field instead. The chart mounts
each entry at `/mnt/secrets-store-<name>`.

```yaml
backend:
  secretProvider:
    - name: my-secret-provider-class
```

## Testing

This chart has a [helm-unittest](https://github.com/helm-unittest/helm-unittest)
test suite under `tests/`. Run the suite before you change a template
or a default value.

```
helm unittest .
```
