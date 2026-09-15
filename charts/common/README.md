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

## Sidecars

A pod takes two kinds, and the difference decides whether anything waits.

| Key | Renders as | Starts | Use it for |
|---|---|---|---|
| `sidecars` | an entry in `containers` | in parallel with every other container | something the app does not depend on, such as a log shipper |
| `nativeSidecars` | an init container with `restartPolicy: Always` | before the containers after it | something the app cannot start without, such as a database proxy |

A native sidecar keeps running for the life of the pod, and Kubernetes starts
whatever follows once it reports *started*. Give it a `startupProbe`, or
"started" means merely *running* — and the container that depends on it races a
port that is not bound yet.

```yaml
backend:
  nativeSidecars:
    - name: cloud-sql-proxy
      image:
        repository: gcr.io
        name: cloud-sql-connectors/cloud-sql-proxy
        tag: 2.17.1
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

Native sidecars render before `initContainers`, so an init container can use
one — a migration that runs through the proxy above, for instance. They need
Kubernetes 1.29 or later.

## Jobs

`common.job` renders a `batch/v1` Job on the same pod template as
`common.deployment`, so sidecars, init containers, volumes, probes and the
service account all behave exactly as they do on a deployment.

```yaml
{{- include "common.job" (list . .Values.migrate .Values.migrate.serviceAccount "myChart.job") }}
```

Job-shaped fields on the job object: `enabled`, `name`, `restartPolicy`
(`Never` by default), `backoffLimit`, `activeDeadlineSeconds`,
`ttlSecondsAfterFinished`, `completions`, `parallelism` and `annotations`.
Each optional one is emitted only when set, so Kubernetes' own defaults apply
otherwise. Put Helm hook annotations in `annotations`, or in the override
template named in the last argument.

**A Job may not use `sidecars`.** A plain sidecar never exits, so the Job never
completes and waits out `activeDeadlineSeconds`. The template fails the render
and points at `nativeSidecars` instead.

See `charts/examples/multideployment` for a worked example and its tests.
