#!/bin/bash
# Script to enable Entity V2 in production

set -e

# Configuration
PROJECT_ID="suzumina-click"
SERVICE_NAME="suzumina-click-web"
REGION="asia-northeast1"

echo "🚀 Enabling Entity V2 in production..."

# Update Cloud Run environment variable
echo "📝 Updating Cloud Run environment variable..."
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --update-env-vars="ENABLE_ENTITY_V2=true"

echo "✅ Entity V2 has been enabled in production!"
echo "🔍 Please verify the deployment at: https://suzumina.click"