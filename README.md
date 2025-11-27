# Interledger Charts repository

Repository for managing all the Interledger related Helm charts in a uniform manner. This Git repository also provides a mechanism to serve Helm assets as a formal Helm repository by using the Github pages mechanism.

All charts heavily depend on the common interledger helm library which attempts to normalise the way in which we produce charts.

## Using the Helm repository

Add the repository to your Helm client:
```
helm repo add interledger-helm https://interledger.github.io/charts/interledger
```

Update the repository:
```
helm repo update
```

# Repository maintenance notes

## Automated chart versioning

This repository auto-bumps Helm chart versions on pull requests and pushes that modify files under the charts/ directory.

How it works
- Trigger: The workflow at [.github/workflows/versioning.yml](.github/workflows/versioning.yml) invokes [JavaScript.runPRVersioning()](tooling/runner.js:135).
- Change detection: [JavaScript.getChangedFiles()](tooling/diffreader.js:19) lists all changed files in the event, which are filtered to charts/... paths.
- Chart resolution: For each changed file, [JavaScript.chartInfoFromChange()](tooling/versioner.js:94) locates the nearest Chart.yaml by walking up from the changed file. The chart name is read from the Chart.yaml (not inferred from folder names).
- Version calculation: [JavaScript.calculateVersions()](tooling/versioner.js:139) uses the PR title (or commit message) as a Conventional Commit to decide the bump level:
  - feat: minor
  - fix and all other types: patch
  - breaking changes (type! or “BREAKING CHANGE”): major
  - If the title/message is not Conventional Commit compliant, it falls back to a patch bump.
- Applying changes: [JavaScript.updateChartVersionFiles()](tooling/chartmanager.js:175) updates “version” and “appVersion” (v{version}) in each affected Chart.yaml.
- Packaging and index:
  - Charts are packaged into docs/interledger using helm: [JavaScript.packageChart()](tooling/chartmanager.js:205).
  - The Helm repository index is regenerated with helm repo index: [JavaScript.regenerateHelmIndex()](tooling/chartmanager.js:226).
- Commit and push: In CI detached-HEAD context, the workflow commits and pushes changes back to the PR branch explicitly via [JavaScript.commitAndPush()](tooling/runner.js:89).

Manual override
- If a PR has the label manual-versioning, automation will skip bumping versions:
  - See the label guard in [JavaScript.runPRVersioning()](tooling/runner.js:152).
- In that case, update Chart.yaml manually and push changes as needed.

Message source priority
- [JavaScript.resolveCommitMessage()](tooling/runner.js:34) uses, in order:
  1) PR title (preferred)
  2) Head commit message
  3) PR_TITLE environment variable
  4) Fallback: chore: bump charts

Notes and caveats
- Only files within charts/... trigger versioning. Changes outside are ignored.
- For PRs originating from forks without write permissions, the push step will be blocked by GitHub (expected constraint).
- The repository URL used when regenerating the index is currently https://interledger.org/charts/. If you publish to GitHub Pages, you may prefer https://interledger.github.io/charts/interledger to match dependency repositories in your Chart.lock files.

Troubleshooting
- “No chart versions to update”: Ensure at least one file under charts/... changed and the PR title is set. Non-Conventional Commit titles still trigger a patch bump.
- “fatal: You are not currently on a branch”: This is handled by pushing to HEAD:refs/heads/<branch> in [JavaScript.commitAndPush()](tooling/runner.js:89).

## Contribution guide

### Contributing

1. **Fork and branch**: Create a feature branch from `main`
2. **Commit conventions**: Use [Conventional Commits](https://www.conventionalcommits.org/) format (e.g., `feat:`, `fix:`, `docs:`)
3. **Testing**: Always that tests are provided for new features and passing tests are included in the contribution
4. **Pull requests**: 
  - Provide a clear description of changes
  - Version bumps are automated unless you add the `manual-versioning` label
  - Link related issues where applicable

For detailed contribution guidelines, see the [Interledger Contributing Guide](https://github.com/interledger/rafiki) part of the Rafiki repository.