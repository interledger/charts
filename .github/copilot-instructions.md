# GitHub Copilot Instructions for Interledger Charts

- **Purpose**: Hosts Helm charts for Interledger; packaged charts + index live in docs/interledger; all charts depend on the shared common library (see [README.md](README.md)).
- **Repo layout**: charts/ holds individual charts; docs/ stores published Helm repo assets; tooling/ contains Node ESM scripts for versioning.
- **Generated assets**: docs/interledger is generated; do not edit by hand.
- **Chart identity**: Chart names come from Chart.yaml `name` (not folder names); versioning walks up from changed files to locate Chart.yaml (see [tooling/versioner.js](tooling/versioner.js)).
- **Auto versioning (PR preview)**: [.github/workflows/versioning.yml](.github/workflows/versioning.yml) runs on pull_request_target (skips chore/version-bump branches), blocks PRs that touch docs/interledger, and previews bumps without committing. Only charts/ changes are considered; bump level comes from PR title/commit message using Conventional Commit rules.
- **Auto versioning (on merge)**: [.github/workflows/versioning-merge.yml](.github/workflows/versioning-merge.yml) runs when a PR merges into main (unless labeled manual-versioning), updates Chart.yaml versions, packages changed charts, regenerates the Helm index, and opens a chore/version-bump PR with automerge labels.
- **Manual override**: Add the manual-versioning label to skip automation and bump Chart.yaml yourself.
- **Common library changes**: When editing the shared common chart, prefer adding the manual-versioning label so you can bump it and update dependent test charts (e.g., charts/tests/common-unittests and charts/examples/*) in the same PR without the auto-versioner firing early.
- **Packaging details**: chartmanager runs `helm dep update`, `helm package`, and `helm repo index` targeting docs/interledger with repo URL https://interledger.github.io/charts/interledger (see [tooling/chartmanager.js](tooling/chartmanager.js)).
- **Commit message source**: resolveCommitMessage prefers PR title, then head commit message, then PR_TITLE env var, otherwise falls back to chore: bump charts (see [tooling/runner.js](tooling/runner.js)).
- **Tooling stack**: Node 24 with pnpm 10; run `pnpm install` in tooling/, then `pnpm lint` (tsc) and `pnpm test` (node --test) (see [tooling/package.json](tooling/package.json)).
- **Helm unit tests CI**: [.github/workflows/unit-tests.yml](.github/workflows/unit-tests.yml) discovers charts (excluding charts/docs/tests/common) and, for each, runs `helm unittest` plus `helm template <chart> | kubeconform -strict -summary -ignore-missing-schemas` inside the ghcr.io/interledger/builders/chartvalidator:v0.5 container.
- **Local validation tip**: Mirror the CI by running helm unittest for the chart and kubeconform against templated output before pushing.
- **CI guardrails**: Versioning workflow fails PRs that modify docs/interledger unless manual-versioning is set (see [.github/workflows/versioning.yml](.github/workflows/versioning.yml)).
- **Conventional commits**: Use feat/fix/breaking titles for correct bumping; non-compliant titles default to a patch bump.
- **Common pitfalls**: Changes outside charts/ do not trigger version bumps; ensure Chart.yaml has a proper `name`; avoid manual edits in generated docs/interledger; automation sets appVersion to v{version} if missing.
- **Publishing**: Helm repo URL is expected to remain https://interledger.github.io/charts/interledger to match Chart.lock dependencies (see [README.md](README.md)).
- **New charts**: Place under charts/, include Chart.yaml and a README; add helm-unittest suites where possible; automation will package and index after merge.
- **Meta**: If you discover missing or outdated guidance, propose updates to this file in your PR to keep agent instructions fresh.
- **Docs**: [README.md](README.md) explains versioning behavior and manual overrides—refer to it when adjusting workflows or version rules.

