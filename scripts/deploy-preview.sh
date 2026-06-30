#!/bin/bash
set -e

echo "▶ Deploying to preview..."
DEPLOY_URL=$(vercel --yes 2>&1 | tee /dev/stderr | grep -E "^Preview:" | awk '{print $2}')

if [ -z "$DEPLOY_URL" ]; then
  echo "✗ Could not capture preview URL"
  exit 1
fi

echo ""
echo "▶ Aliasing to cf-scores-homolog.vercel.app..."
vercel alias "$DEPLOY_URL" cf-scores-homolog.vercel.app

echo ""
echo "✓ Preview: https://cf-scores-homolog.vercel.app"
