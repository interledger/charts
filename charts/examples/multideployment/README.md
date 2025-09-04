# ILF Common chart library multi deployment

This folder contains a Helm chart that demonstrates how to use the ilf common helm chart library to quickly create a Helm chart.

In this example we will demonstrate how to create a Helm chart with the following deployments:
- `web` - A deployment for serving web content
- `backend` - A deployment for serving the backend
- `admin` - A deployment for serving an admin portal
- `worker` - A deployment for performing asyncronous tasks

Appropriate services will be created for serving the backend, frontend and admin portal.

A single ConfigMap will be created and all components will read their configurations from there.
