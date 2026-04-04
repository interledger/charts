{{/*
pg-autogrant helpers — delegates to the common library.
*/}}

{{- define "pg-autogrant.fullname" -}}
{{- include "common.fullname" . }}
{{- end }}

{{- define "pg-autogrant.labels" -}}
{{- include "common.labels" (list .) }}
{{- end }}

{{- define "pg-autogrant.selectorLabels" -}}
{{- include "common.selectorLabels" (list .) }}
{{- end }}
