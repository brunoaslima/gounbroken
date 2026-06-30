#!/bin/bash

echo "🚀 Deploying Supabase Edge Functions..."

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo ""
  echo "❌ SUPABASE_ACCESS_TOKEN não encontrado."
  echo "   Cole seu token de acesso:"
  read -s TOKEN
  export SUPABASE_ACCESS_TOKEN=$TOKEN
fi

npx supabase functions deploy generate-workout --project-ref htuttqstiiettedrmgnf

echo ""
echo "✅ Done!"
