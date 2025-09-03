{{- define "common.labels" -}}
{{ $top := first . -}}
helm.sh/chart: {{ include "common.chart" $top }}
{{ include "common.selectorLabels" . }}
{{- with $top.Chart.AppVersion }}
app.kubernetes.io/version: {{ . | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ $top.Release.Service }}
{{- end }}

{{- define "common.selectorLabels" -}}
{{ $top := first . -}}
{{- if eq (len .) 2 -}}
  {{- $component := index . 1 -}}
  {{- $name := include "common.fullname" $top }}
  {{- if $component.name }}
    {{- $name = printf "%s-%s" $name $component.name }}
  {{- end }}
app.kubernetes.io/name: {{ $name }}
{{- else -}}
app.kubernetes.io/name: {{ include "common.fullname" $top }}
{{- end }}
app.kubernetes.io/instance: {{ include "common.fullname" $top }}
{{- end }}

{{- define "common.metadata.tpl" -}}
{{- $top := first . -}}
{{- $component := dict -}}
{{ if eq (len .) 2 -}}
  {{- $component = index . 1 -}}
{{- end }}
labels:
  {{- include "common.labels" (list $top $component) | nindent 2 }}
{{- end }}

{{- define "common.metadata" -}}
{{- include "common.utils.merge" (append . "common.metadata.tpl") }}
{{- end }}
