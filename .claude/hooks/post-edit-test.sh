#!/bin/bash
# Roda npm test após edições em arquivos TypeScript/TSX.
# Exit 0 = tudo ok (ou não é arquivo TS)
# Exit 2 = testes falharam → Claude vê o output e precisa corrigir antes de continuar

INPUT="$1"
PROJECT_DIR="/Users/brunolima1/Documents/score crossfit"

# Só roda para arquivos .ts ou .tsx dentro de src/
if ! echo "$INPUT" | grep -qE '"src/.*\.(ts|tsx)"'; then
  exit 0
fi

# Roda os testes
OUTPUT=$(cd "$PROJECT_DIR" && npm test 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  SUMMARY=$(echo "$OUTPUT" | grep -E "Tests\s+[0-9]+ passed")
  echo "TESTES OK — $SUMMARY"
  exit 0
else
  echo "TESTES FALHARAM — corrigir antes de continuar:"
  echo ""
  echo "$OUTPUT" | grep -A 8 "FAIL\|Error\|Expected\|Received" | head -40
  echo ""
  echo "--- resumo ---"
  echo "$OUTPUT" | tail -8
  exit 2
fi
