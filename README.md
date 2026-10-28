# Bitrix24 CRM automation services

Private source snapshot of the five Node.js services currently deployed under `/var/www/rvi-mavriki`.

## Services

| Directory | Purpose | Default port | Endpoint |
| --- | --- | ---: | --- |
| `document-generator` | Generates property-selection DOCX and PDF documents | 3012 | `POST /bitrix/document-created` |
| `document-signing` | Signs PDF files from deal fields, uploads them to Bitrix.Disk, and posts a timeline link | 3014 | `POST /process-documents/:dealId` |
| `email-stage-control` | Records qualifying outgoing email activity on the deal | 3013 | `POST /bitrix/events/activity` |
| `postponed-deals-control` | Starts and persists follow-up cycles for postponed deals | 3015 | `POST /postponed/start/:dealId` |
| `visit-scheduler` | Schedules a client visit from deal data | 3016 | `POST /visit/start/:dealId` |

All services expose `GET /health`. Endpoints that require a shared secret expect it as configured by the service; do not put live secret values in source control.

## Repository contents

Each service directory contains its deployed source, package manifests, and service-specific resources such as document templates or signature artwork. `node_modules`, `.env` files, logs, generated/failed documents, and persisted postponed-cycle state are intentionally not part of this repository.

The current postponed-cycle state belongs to the running server, not to a source checkout. Back it up and manage it separately when migrating the service.

## Runtime configuration

See [SERVICE-CONFIGURATION.md](SERVICE-CONFIGURATION.md) for the environment-variable names required by each service. Store actual values in a server-side environment file or secret manager only. Never commit tokens, webhook URLs containing credentials, or customer documents.

## Running locally

Use a separate working directory for each service, install its dependencies from the package manifest/lockfile where present, provide its required environment variables, then run:

```sh
npm start
```

`document-generator` also requires LibreOffice for DOCX-to-PDF conversion. Do not point test runs at production deals unless you intend the service's normal Bitrix side effects.
