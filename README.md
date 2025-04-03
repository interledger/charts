# Interledger Charts repository

The new location for all the Interledger related Helm charts. This repository also serves a Helm repository from the docs folder using Github pages.

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

When making changes to your chart, please ensure that you update the version in the `Chart.yaml` file. This is important for both the chart and the library.

## Releasing a new version
(Soon this will be automated)

Package the chart and add to the repository:
```
# Update the dependencies of your chart
helm dep update charts/${CHART_NAME}
# From the repository root
helm package charts/${CHART_NAME} -d docs/interledger
# Regenerate the index
helm repo index docs/interledger --url https://interledger.github.io/charts/interledger
```