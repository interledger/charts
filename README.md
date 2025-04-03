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