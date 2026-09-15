{{- define "common.pod.template.tpl" -}}
{{- $top := first . }}
{{- $pod := index . 1 }}
{{- $serviceAccount := index . 2 }}
metadata:
  {{- with $pod.podAnnotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  labels:
    {{- include "common.selectorLabels" (list $top $pod) | nindent 4 }}
  {{- with $pod.podLabels }}
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if $serviceAccount.name }}
  serviceAccountName: {{ include "common.serviceAccountName" (list $top $serviceAccount) }}
  {{- else }}
  automountServiceAccountToken: true
  {{- end }}
  securityContext:
    {{- toYaml $top.Values.podSecurityContext | nindent 4 }}
  {{- /*
  A pod in a Deployment restarts forever and needs no restartPolicy. A pod in a
  Job needs Never or OnFailure, so this is emitted only when it is set.
  */}}
  {{- with $pod.restartPolicy }}
  restartPolicy: {{ . }}
  {{- end }}
  {{- /*
  nativeSidecars render as init containers with restartPolicy Always.

  Kubernetes keeps such a container running for the life of the pod, and starts
  whatever follows it once it reports started. That is what a plain sidecar
  under `sidecars` cannot do: it joins `containers`, starts in parallel with
  everything else, and in a Job it never exits, so the Job never completes.

  Give a native sidecar a startupProbe. Without one the kubelet calls it
  started as soon as it is running, rather than when it is ready to serve, and
  whatever depends on it races it.

  They render before initContainers on purpose: a native sidecar is the
  infrastructure an init container is likely to need, such as a database proxy
  an init container migrates through.

  Native sidecars need Kubernetes 1.29 or later.
  */}}
  {{- if or $pod.nativeSidecars $pod.initContainers }}
  initContainers:
    {{- range $sidecar := $pod.nativeSidecars }}
      {{- include "common.container" (list $top $sidecar $pod) | trim | nindent 4 }}
      restartPolicy: Always
    {{- end }}
    {{- range $initContainer := $pod.initContainers }}
      {{- include "common.container" (list $top $initContainer $pod) | nindent 4 }}
    {{- end }}
  {{- end }}
  containers:
  {{/* If current deployment object has no containers defined we assume we can get the paramers from the deployment object for the main container */}}
  {{- if empty $pod.containers }}
    {{- include "common.container" (list $top $pod $pod) | nindent 4 }}  
  {{- end }}
  {{/* If the containers array is provided then use that to generate the main container*/}}
  {{- range $container := $pod.containers }}
    {{- include "common.container" (list $top $container $pod) | nindent 4 }}
  {{- end }}
  {{- range $container := $pod.sidecars }}
    {{- include "common.container" (list $top $container $pod) | nindent 4 }}
  {{- end }}
  {{- with $pod.nodeSelector }}
  nodeSelector:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with $pod.affinity }}
  affinity:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with $pod.tolerations }}
  tolerations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with $pod.priorityClassName }}
  priorityClassName: {{ . }}
  {{- end }}
  {{- if $pod.topologySpreadConstraints }}
  topologySpreadConstraints:
    {{- toYaml $pod.topologySpreadConstraints | nindent 4 }}
  {{- end }}
  {{- if or ($pod.secretProvider) ($pod.volumes) }}
  volumes:
    {{- range $secretProvider := $pod.secretProvider }}
    - name: {{ $secretProvider.name }}
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: {{ $secretProvider.name }}
    {{- end }}
    {{- with $pod.volumes }}
      {{- toYaml . | nindent 4 }}
    {{- end }}
  {{- end }}
{{- end }}

{{- define "common.pod.template" -}}
{{- include "common.utils.merge" (append . "common.pod.template.tpl") }}
{{- end }}
