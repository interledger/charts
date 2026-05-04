# Rafiki Helm Chart

Deploys [Rafiki](https://rafiki.dev) — an open-source Interledger Protocol node for account servicing entities.

> **Note:** Rafiki is intended for regulated account servicing entities only.

## Components

Each component is enabled via its `config.<component>.enabled` flag in [`values.yaml`](./values.yaml):

| Component | Default | Description |
|---|---|---|
| `backend` | enabled | Core ILP functionality, GraphQL Admin API, Open Payments API |
| `auth` | enabled | GNAP authorization server for Open Payments |
| `frontend` | enabled | Web UI for managing the Rafiki instance |
| `cards` | disabled | Card service integration (Rafiki v2.3.0-beta+) |
| `pos` | disabled | Point-of-sale service integration (Rafiki v2.3.0-beta+) |

## Configuration

All configuration options are documented inline in [`values.yaml`](./values.yaml). Create a custom values file that overrides only what you need:

```sh
helm install rafiki interledger/rafiki -f my-values.yaml
```

## Secrets

`shouldCreateSecrets` defaults to `false` for each component — the chart expects secrets to already exist in the cluster. For non-production deployments you can set it to `true` and supply secret values directly in your values file.

## Private key

The backend requires an Ed25519 private key (`config.backend.key.pvk`). If left empty, the chart spawns a one-time Job to generate and store the key automatically. For production, generate your own and provide it as a base64-encoded PEM:

```sh
openssl genpkey -algorithm Ed25519 -out private.pem
echo -n "$(cat private.pem)" | base64 -w0
```

## Further reading

- [Rafiki documentation](https://rafiki.dev)
- [GitHub Issues](https://github.com/interledger/rafiki/issues)
