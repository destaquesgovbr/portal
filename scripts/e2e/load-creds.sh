#!/usr/bin/env bash
# Source este script: `source ./scripts/e2e/load-creds.sh`
# Exporta credenciais necessárias para os testes E2E contra staging:
#  - E2E_BOT_PASSWORD: senha do bot Keycloak (Direct Access Grant)
#  - AUTH_SECRET: chave usada pelo portal para cifrar cookies de sessão
#    NextAuth — necessária para forjar um session cookie programaticamente
#    e bypassar o browser-based OIDC flow.
export E2E_BOT_PASSWORD=$(gcloud secrets versions access latest \
  --secret=keycloak-e2e-bot-password --project=inspire-7-finep)
export AUTH_SECRET=$(gcloud secrets versions access latest \
  --secret=auth-secret --project=inspire-7-finep)
echo "E2E_BOT_PASSWORD exportado (len=${#E2E_BOT_PASSWORD})"
echo "AUTH_SECRET exportado (len=${#AUTH_SECRET})"
