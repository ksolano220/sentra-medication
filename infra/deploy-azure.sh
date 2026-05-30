#!/usr/bin/env bash
# Sentra Medication: Azure deploy script
#
# Provisions:
#   - Resource group in Germany West Central (GDPR-compliant)
#   - Linux App Service Plan (B1 default; change SKU below for free F1)
#   - FastAPI supervisor as Python 3.12 web app
#   - Next.js dashboard as an Azure Static Web App, sourced from this repo
#
# Prereqs:
#   - az CLI installed (brew install azure-cli OR pip install azure-cli)
#   - az login completed
#   - This repo pushed to GitHub at REPO_URL below
#
# Usage:
#   bash infra/deploy-azure.sh
#
# Idempotent: safe to re-run. Existing resources are left in place.

set -euo pipefail

# ---- Config ---------------------------------------------------------------
RG="sentra-medication-rg"
LOCATION="germanywestcentral"
ASP="sentra-asp"
SUPERVISOR_APP="sentra-supervisor"
SWA="sentra-medication-web"
REPO_URL="https://github.com/ksolano220/sentra-medication"
BRANCH="main"
SKU="B1"  # Free tier is "F1" (no SSL, sleeps after 20min idle)

# ---- 0. Verify auth -------------------------------------------------------
echo ""
echo "==> Verifying az login"
az account show > /dev/null || {
  echo "ERROR: Not logged in. Run 'az login' first."
  exit 1
}
SUB=$(az account show --query "name" -o tsv)
echo "    Subscription: $SUB"

# ---- 1. Register resource providers ---------------------------------------
echo ""
echo "==> Registering resource providers (Microsoft.Web, Microsoft.Insights)"
az provider register --namespace Microsoft.Web --wait --output none
az provider register --namespace Microsoft.Insights --wait --output none

# ---- 2. Resource group ----------------------------------------------------
echo ""
echo "==> Creating resource group: $RG ($LOCATION)"
az group create --name "$RG" --location "$LOCATION" --output none

# ---- 3. App Service Plan --------------------------------------------------
echo ""
echo "==> Creating App Service Plan: $ASP (Linux, $SKU)"
az appservice plan create \
  --name "$ASP" \
  --resource-group "$RG" \
  --is-linux \
  --sku "$SKU" \
  --output none

# ---- 4. Supervisor Web App ------------------------------------------------
echo ""
echo "==> Creating Supervisor Web App: $SUPERVISOR_APP (Python 3.12)"
az webapp create \
  --resource-group "$RG" \
  --plan "$ASP" \
  --name "$SUPERVISOR_APP" \
  --runtime "PYTHON:3.12" \
  --output none

echo "==> Setting startup command (uvicorn on \$PORT)"
az webapp config set \
  --resource-group "$RG" \
  --name "$SUPERVISOR_APP" \
  --startup-file "python -m uvicorn supervisor.main:app --host 0.0.0.0 --port \$PORT" \
  --output none

echo "==> Setting required app settings"
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$SUPERVISOR_APP" \
  --settings \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    WEBSITES_PORT=8000 \
  --output none

# ---- 5. Deploy supervisor code -------------------------------------------
echo ""
echo "==> Zipping supervisor sources (excluding .venv, frontend, node_modules)"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP_PATH="/tmp/sentra-supervisor-$(date +%s).zip"
( cd "$REPO_ROOT" && \
  zip -qr "$ZIP_PATH" \
    supervisor sdk demo requirements.txt \
    -x "*__pycache__*" \
    -x "*.venv*" \
    -x "supervisor/runtime_log.json" \
    -x "supervisor/state_store.json" )

echo "==> Deploying zip to $SUPERVISOR_APP"
az webapp deploy \
  --resource-group "$RG" \
  --name "$SUPERVISOR_APP" \
  --src-path "$ZIP_PATH" \
  --type zip \
  --output none

SUPERVISOR_URL="https://${SUPERVISOR_APP}.azurewebsites.net"
echo "    Supervisor URL: $SUPERVISOR_URL"

echo "==> Waiting 30s for cold start, then health check"
sleep 30
if curl -sf "$SUPERVISOR_URL/health" > /dev/null; then
  echo "    Health check: OK"
else
  echo "    WARN: /health did not return 200 yet (cold start can take 2-3 min on first deploy)"
fi

# ---- 6. Static Web App for frontend ---------------------------------------
echo ""
echo "==> Creating Azure Static Web App: $SWA"
echo "    (A browser window may open for GitHub authorization)"
az staticwebapp create \
  --name "$SWA" \
  --resource-group "$RG" \
  --source "$REPO_URL" \
  --branch "$BRANCH" \
  --app-location "frontend" \
  --output-location "out" \
  --login-with-github \
  --output none

echo "==> Setting NEXT_PUBLIC_SENTRA_URL on Static Web App"
az staticwebapp appsettings set \
  --name "$SWA" \
  --setting-names "NEXT_PUBLIC_SENTRA_URL=$SUPERVISOR_URL" \
  --output none

SWA_HOST=$(az staticwebapp show \
  --name "$SWA" \
  --resource-group "$RG" \
  --query "defaultHostname" -o tsv)
SWA_URL="https://${SWA_HOST}"

# ---- 7. Summary -----------------------------------------------------------
echo ""
echo "============================================================"
echo "  Sentra Medication deployed"
echo "============================================================"
echo "  Supervisor (FastAPI):  $SUPERVISOR_URL"
echo "  Health endpoint:       $SUPERVISOR_URL/health"
echo "  Events endpoint:       $SUPERVISOR_URL/events"
echo "  Dashboard (Next.js):   $SWA_URL"
echo ""
echo "  Region:                $LOCATION (Frankfurt, GDPR-compliant)"
echo "  Subscription:          $SUB"
echo ""
echo "  Next steps:"
echo "    1. Tighten CORS on supervisor: replace allow_origins=['*'] with"
echo "       ['$SWA_URL'] in supervisor/main.py and redeploy."
echo "    2. The SWA auto-deploys the frontend from GitHub on every push to"
echo "       $BRANCH. To force a redeploy: push an empty commit."
echo "    3. To redeploy the supervisor: re-run this script (idempotent)."
echo "============================================================"
