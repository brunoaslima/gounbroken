#!/bin/bash
# Dispara antes de Edit / Write / MultiEdit
# Lembra Claude de rodar os agentes de Arquitetura e Segurança antes de implementar.
# Exit 0 = permite a tool call (Claude decide se precisa de revisão)
# Exit 2 = bloqueia a tool call (reservado para casos futuros de enforcement duro)

TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
INPUT="$1"

# Detecta se parece uma mudança não-trivial pelo nome do arquivo sendo editado
# (heurística: arquivos de página, hook, lib, Edge Function, migration = não-trivial)
NON_TRIVIAL=0
if echo "$INPUT" | grep -qE '"pages/|hooks/|lib/|functions/|migrations/|App\.tsx|supabase/'  2>/dev/null; then
  NON_TRIVIAL=1
fi

if [ "$NON_TRIVIAL" -eq 1 ]; then
  cat << 'EOF'
┌─────────────────────────────────────────────────────────────┐
│         PRÉ-IMPLEMENTAÇÃO — REVISÃO OBRIGATÓRIA             │
└─────────────────────────────────────────────────────────────┘

Esta mudança afeta uma área não-trivial do projeto.
Antes de prosseguir, confirme:

  [ ] Agente ARQUITETO consultado e aprovou a abordagem?
  [ ] Agente SECURITY ENGINEER consultado e não encontrou vulnerabilidades críticas/altas?

Se ainda não foram consultados → PARE e invoque os dois agentes em paralelo (ver CLAUDE.md).
Se já foram consultados e aprovaram → pode continuar.

EOF
fi

exit 0
