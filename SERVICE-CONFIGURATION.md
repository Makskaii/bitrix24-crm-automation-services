# Service configuration reference

This file lists variable names only. Supply real values through each service's local `.env` or its process manager; no live credentials are included here.

## `document-generator` (3012)

Required: `BITRIX_PORTAL_URL`, `BITRIX_REST_URL`, `EVENT_SECRET`.

Optional: `PORT`, `REAL_ESTATE_ENTITY_TYPE_ID`, `CATEGORY_LONG_TERM`, `CATEGORY_SHORT_TERM`, `CATEGORY_SALE`, `TEMPLATE_FILE`.

The included template is `templates/STANFORD_Teaser_template_with_placeholders.docx`. Set `TEMPLATE_FILE` to that relative path unless deploying a different template.

## `document-signing` (3014)

Required: `BITRIX_PORTAL_URL`, `BITRIX_REST_URL`.

Optional: `PORT`, `DISK_STORAGE_ID`, `COMPLIANCE_ROOT_FOLDER`, `SIGNATURE_IMAGE`, `RETRY_ATTEMPTS`, `RETRY_DELAY_MS`, `DEAL_PROCESSED_FIELD`.

## `email-stage-control` (3013)

Required: `BITRIX_PORTAL_URL`, `BITRIX_REST_URL`, `EVENT_SECRET`.

Optional: `PORT`, `DEAL_EMAIL_SENT_FIELD`.

## `postponed-deals-control` (3015)

Required: `BITRIX_PORTAL_URL`, `BITRIX_REST_URL`, `EVENT_SECRET`.

Optional: `POSTPONED_PORT`, `POSTPONED_CHECK_INTERVAL_MS`, `POSTPONED_DELAY_MINUTES`.

The service creates its persistent cycle-state file under `data/`; that runtime file is deliberately excluded from Git.

## `visit-scheduler` (3016)

Required: `BITRIX_PORTAL_URL`, `BITRIX_REST_URL`, `EVENT_SECRET`.

Optional: `VISIT_PORT`.
