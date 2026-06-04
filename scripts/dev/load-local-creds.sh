#!/usr/bin/env bash
# Source este script ANTES de `pnpm dev` para garantir que o ambiente
# local esta corretamente preparado para falar com Keycloak Cloud Run
# (auth) + graphql-api local (queries).
#
# Uso:
#   source ./scripts/dev/load-local-creds.sh
#   pnpm dev
#
# O que faz:
#  1. Valida que `gcloud` esta autenticado no projeto `inspire-7-finep`.
#  2. Valida que Application Default Credentials (ADC) existem — usadas
#     por libs Google (Firestore, Pub/Sub etc) e pelo `firebase-admin`
#     que o portal usa em routes server-side.
#  3. NAO carrega secrets do GCP Secret Manager — credenciais sensiveis
#     (AUTH_GOVBR_SECRET) ficam em `.env.local` (gitignored). Se voce
#     precisa regenera-lo, rode `infra/scripts/create-keycloak-client.sh
#     portal-local <redirect_uri> --rotate-secret` e atualize `.env.local`.

set -u

GCP_PROJECT="${GCP_PROJECT:-inspire-7-finep}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "✗ gcloud nao encontrado. Instale Google Cloud SDK." >&2
  return 1 2>/dev/null || exit 1
fi

ACTIVE=$(gcloud config get-value account 2>/dev/null)
if [ -z "$ACTIVE" ] || [ "$ACTIVE" = "(unset)" ]; then
  echo "✗ gcloud sem account ativa. Rode: gcloud auth login" >&2
  return 1 2>/dev/null || exit 1
fi
echo "✓ gcloud account: $ACTIVE"

ADC_FILE="${HOME}/.config/gcloud/application_default_credentials.json"
if [ ! -f "$ADC_FILE" ]; then
  echo "✗ ADC ausente. Rode: gcloud auth application-default login" >&2
  return 1 2>/dev/null || exit 1
fi
echo "✓ ADC presente ($ADC_FILE)"

# Sanity check: consegue ler um secret pequeno (mesma origem usada
# para detectar permissoes faltantes do dev no projeto)
if ! gcloud secrets versions access latest --secret=keycloak-admin-password \
     --project="$GCP_PROJECT" >/dev/null 2>&1; then
  echo "⚠ sem acesso a Secret Manager no projeto $GCP_PROJECT (esperado para devs sem role)." >&2
  echo "  Isso so eh problema se voce precisa regenerar AUTH_GOVBR_SECRET via script." >&2
fi

export GOOGLE_CLOUD_PROJECT="$GCP_PROJECT"
export GOOGLE_APPLICATION_CREDENTIALS="$ADC_FILE"
echo "✓ GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT"

echo ""
echo "Pronto. Agora rode: pnpm dev"
