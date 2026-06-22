#!/usr/bin/env bash
# Deploy the web app to Railway (project family-events-ui / production / service web).
#
# Uploads the current checkout; Railway builds it via railway.toml and deploys. Used by
# .github/workflows/deploy.yml after CI passes; run locally with `railway login` (or
# RAILWAY_API_TOKEN / RAILWAY_TOKEN set in the environment).
set -euo pipefail

PROJECT_ID="${RAILWAY_PROJECT_ID:-b97c92f7-464e-4f77-a760-725fc9fdb5a2}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
SERVICE="${RAILWAY_SERVICE:-web}"

echo "Deploying service '${SERVICE}' to ${PROJECT_ID}/${ENVIRONMENT}…"

# --ci streams build logs then exits with the build's status (fails on a bad build);
# --yes skips the surrounding prompts in a non-interactive context.
railway up --ci --yes \
  --project "${PROJECT_ID}" \
  --environment "${ENVIRONMENT}" \
  --service "${SERVICE}"
