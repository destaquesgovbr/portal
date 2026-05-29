#!/usr/bin/env bash
# Source este script: `source ./scripts/e2e/load-creds.sh`
# Exporta E2E_BOT_PASSWORD a partir do Secret Manager.
export E2E_BOT_PASSWORD=$(gcloud secrets versions access latest \
  --secret=keycloak-e2e-bot-password --project=inspire-7-finep)
echo "E2E_BOT_PASSWORD exportado (len=${#E2E_BOT_PASSWORD})"
