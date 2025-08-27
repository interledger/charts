# GitHub scripts

Scripts for Github actions automation.

## Scenarios

### On merging
- Analyse all modified files of the PR
- All charts which had their contents modified will receive a version bump according to the conventional commit rules from PR title

## Local development

### Prerequisites

- [NodeJS](https://nodejs.org) version 20 or later
- [PNPM](https://pnpm.io)

### Environment setup

1. Install dependencies
```sh
pnpm install
```

---

### Useful commands

| Description                    | Command                        |
| ------------------------------ | ------------------------------ |
| Test scripts                   | `pnpm test`                    |
| lint                           | `pnpm lint`                    |


