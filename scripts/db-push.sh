#!/usr/bin/env bash
# Executa um arquivo SQL no Supabase via Management API.
# Uso: ./scripts/db-push.sh supabase/migrations/meu_arquivo.sql

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: .env.local não encontrado" >&2
  exit 1
fi

# Carrega variáveis do .env.local
export $(grep -v '^#' "$ENV_FILE" | grep -E 'SUPABASE_PROJECT_REF|SUPABASE_MANAGEMENT_TOKEN' | xargs)

if [[ -z "${SUPABASE_PROJECT_REF:-}" || -z "${SUPABASE_MANAGEMENT_TOKEN:-}" ]]; then
  echo "Erro: SUPABASE_PROJECT_REF ou SUPABASE_MANAGEMENT_TOKEN ausentes no .env.local" >&2
  exit 1
fi

SQL_FILE="${1:-}"
if [[ -z "$SQL_FILE" ]]; then
  echo "Uso: $0 <arquivo.sql>" >&2
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Erro: arquivo não encontrado: $SQL_FILE" >&2
  exit 1
fi

SQL=$(cat "$SQL_FILE")

echo "Rodando: $SQL_FILE"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_MANAGEMENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query: $q}')")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "201" ]]; then
  echo "Erro HTTP $HTTP_CODE:" >&2
  echo "$BODY" >&2
  exit 1
fi

echo "OK — $HTTP_CODE"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
