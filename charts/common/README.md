# ILF Common Chart Library
Please see the tests under ../examples on how to use this library.

Please also help document this library.

## Probes

A container block accepts `livenessProbe`, `readinessProbe` and `startupProbe`.
Each takes one action — `httpGet`, `tcpSocket`, `grpc` or `exec` — and the
timing fields Kubernetes defines. The library fills in any timing you leave out.

```yaml
web:
  startupProbe:
    httpGet:
      path: /startup
      port: 9090
  readinessProbe:
    tcpSocket:
      port: 8080
```

Liveness and readiness share one set of defaults. A startup probe answers a
different question — has this container finished starting? — so it has its own.

| Field | liveness / readiness | startup |
|---|---|---|
| `initialDelaySeconds` | 30 | 0 |
| `periodSeconds` | 5 | 2 |
| `timeoutSeconds` | 1 | 1 |
| `failureThreshold` | 3 | 30 |
| `successThreshold` | 1 | 1, fixed |

`successThreshold` on a startup probe is always 1. Kubernetes rejects any other
value, so the library does not let you set one.

### A startup probe is what makes a native sidecar gate the containers after it

An init container with `restartPolicy: Always` is a native sidecar. Kubernetes
starts the containers after it once it reports started — and without a startup
probe, "started" means *running*, not *ready to serve*.

A sidecar that needs a moment to bind a port therefore loses a race with the
container that depends on it, which fails on connection refused. Give the
sidecar a startup probe and the race disappears:

```yaml
sidecars:
  - name: cloud-sql-proxy
    args:
      - "--health-check"
      - "--http-address=0.0.0.0"
      - "--http-port=9090"
      - "<instance connection name>"
    startupProbe:
      httpGet:
        path: /startup
        port: 9090
```

This applies only where the sidecar is a native sidecar. A plain sidecar listed
under `containers` starts in parallel with every other container, and a startup
probe on it delays nothing.
