#!/usr/bin/env bash
# Gera JWT do bot e2e via Keycloak Direct Access Grant.
# Usage: ./scripts/e2e/get-test-jwt.sh
# Outputs: JSON com access_token. Use com `| jq -r .access_token`.
set -euo pipefail

KC_URL="${KC_URL:-https://destaquesgovbr-keycloak-klvx64dufq-rj.a.run.app}"
REALM="${KC_REALM:-destaquesgovbr}"
CLIENT_ID="${KC_CLIENT_ID:-portal-e2e}"
BOT_USERNAME="${E2E_BOT_USERNAME:-e2e-bot@destaquesgovbr.gov.br}"
SECRET_NAME="${E2E_BOT_SECRET:-keycloak-e2e-bot-password}"
GCP_PROJECT="${GCP_PROJECT:-inspire-7-finep}"

BOT_PW=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$GCP_PROJECT")

curl -sS -X POST "$KC_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "username=$BOT_USERNAME" \
  --data-urlencode "password=$BOT_PW"
