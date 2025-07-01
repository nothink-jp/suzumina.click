#!/bin/bash
# Manual cleanup script for GCP resources
# Usage: ./scripts/cleanup-gcp-resources.sh [--dry-run] [--web|--admin|--all]

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION="asia-northeast1"
REPOSITORY="suzumina-click-web"
WEB_SERVICE="suzumina-click-web"
WEB_IMAGE="web"
ADMIN_SERVICE="suzumina-admin"
ADMIN_IMAGE="suzumina-admin"

# Default settings
DRY_RUN=false
TARGET="all"
KEEP_IMAGES=5
KEEP_REVISIONS=3

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --web)
      TARGET="web"
      shift
      ;;
    --admin)
      TARGET="admin"
      shift
      ;;
    --all)
      TARGET="all"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--web|--admin|--all]"
      echo ""
      echo "Options:"
      echo "  --dry-run    Show what would be deleted without actually deleting"
      echo "  --web        Clean up only web app resources"
      echo "  --admin      Clean up only admin app resources"
      echo "  --all        Clean up all resources (default)"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "🧹 GCP Resources Cleanup Script"
echo "=================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Target: $TARGET"
echo "Dry run: $DRY_RUN"
echo ""

# Function to cleanup service
cleanup_service() {
  local service_name=$1
  local image_name=$2
  local keep_images=${3:-$KEEP_IMAGES}
  local keep_revisions=${4:-$KEEP_REVISIONS}
  
  echo "🔧 Cleaning up $service_name..."
  
  # 1. Cloud Run revisions cleanup
  echo "🗂️  Checking Cloud Run revisions..."
  
  REVISIONS=$(gcloud run revisions list \
    --service="$service_name" \
    --region="$REGION" \
    --sort-by="~metadata.creationTimestamp" \
    --format="value(metadata.name)" 2>/dev/null || echo "")
  
  if [ -n "$REVISIONS" ]; then
    REVISION_ARRAY=($REVISIONS)
    TOTAL_REVISIONS=${#REVISION_ARRAY[@]}
    echo "  Found $TOTAL_REVISIONS revisions"
    
    if [ $TOTAL_REVISIONS -gt $keep_revisions ]; then
      DELETE_COUNT=$((TOTAL_REVISIONS - keep_revisions))
      echo "  Will delete $DELETE_COUNT old revisions (keeping latest $keep_revisions)"
      
      for ((i=keep_revisions; i<TOTAL_REVISIONS; i++)); do
        REVISION=${REVISION_ARRAY[$i]}
        echo "    - $REVISION"
        
        if [ "$DRY_RUN" = false ]; then
          if gcloud run revisions delete "$REVISION" \
            --region="$REGION" \
            --quiet 2>/dev/null; then
            echo "      ✅ Deleted"
          else
            echo "      ⚠️  Failed to delete (may be in use)"
          fi
        fi
      done
    else
      echo "  ✅ Revision count is within limit ($TOTAL_REVISIONS revisions)"
    fi
  else
    echo "  No revisions found for $service_name"
  fi
  
  # 2. Docker images cleanup
  echo "🐳 Checking Docker images..."
  
  REPOSITORY_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$image_name"
  IMAGES=$(gcloud artifacts docker images list "$REPOSITORY_PATH" \
    --sort-by="~CREATE_TIME" \
    --format="value(IMAGE)" 2>/dev/null || echo "")
  
  if [ -n "$IMAGES" ]; then
    IMAGE_ARRAY=($IMAGES)
    TOTAL_IMAGES=${#IMAGE_ARRAY[@]}
    echo "  Found $TOTAL_IMAGES images"
    
    if [ $TOTAL_IMAGES -gt $keep_images ]; then
      DELETE_COUNT=$((TOTAL_IMAGES - keep_images))
      echo "  Will delete $DELETE_COUNT old images (keeping latest $keep_images)"
      
      for ((i=keep_images; i<TOTAL_IMAGES; i++)); do
        IMAGE=${IMAGE_ARRAY[$i]}
        echo "    - $IMAGE"
        
        if [ "$DRY_RUN" = false ]; then
          if gcloud artifacts docker images delete "$IMAGE" \
            --delete-tags \
            --quiet 2>/dev/null; then
            echo "      ✅ Deleted"
          else
            echo "      ⚠️  Failed to delete (may be in use)"
          fi
        fi
      done
    else
      echo "  ✅ Image count is within limit ($TOTAL_IMAGES images)"
    fi
  else
    echo "  No images found for $image_name"
  fi
  
  echo ""
}

# Main cleanup logic
case $TARGET in
  web)
    cleanup_service "$WEB_SERVICE" "$WEB_IMAGE" 10 5
    ;;
  admin)
    cleanup_service "$ADMIN_SERVICE" "$ADMIN_IMAGE" 5 3
    ;;
  all)
    cleanup_service "$WEB_SERVICE" "$WEB_IMAGE" 10 5
    cleanup_service "$ADMIN_SERVICE" "$ADMIN_IMAGE" 5 3
    ;;
esac

# Final summary
echo "📊 Final Status"
echo "==============="

# Web app status
if [ "$TARGET" = "web" ] || [ "$TARGET" = "all" ]; then
  WEB_REPO_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$WEB_IMAGE"
  WEB_IMAGES=$(gcloud artifacts docker images list "$WEB_REPO_PATH" \
    --format="value(IMAGE)" 2>/dev/null | wc -l || echo "0")
  WEB_REVISIONS=$(gcloud run revisions list \
    --service="$WEB_SERVICE" \
    --region="$REGION" \
    --format="value(metadata.name)" 2>/dev/null | wc -l || echo "0")
  
  echo "Web App:"
  echo "  Docker images: $WEB_IMAGES"
  echo "  Cloud Run revisions: $WEB_REVISIONS"
fi

# Admin app status
if [ "$TARGET" = "admin" ] || [ "$TARGET" = "all" ]; then
  ADMIN_REPO_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$ADMIN_IMAGE"
  ADMIN_IMAGES=$(gcloud artifacts docker images list "$ADMIN_REPO_PATH" \
    --format="value(IMAGE)" 2>/dev/null | wc -l || echo "0")
  ADMIN_REVISIONS=$(gcloud run revisions list \
    --service="$ADMIN_SERVICE" \
    --region="$REGION" \
    --format="value(metadata.name)" 2>/dev/null | wc -l || echo "0")
  
  echo "Admin App:"
  echo "  Docker images: $ADMIN_IMAGES"
  echo "  Cloud Run revisions: $ADMIN_REVISIONS"
fi

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "🏃 This was a dry run. To actually delete resources, run without --dry-run"
else
  echo ""
  echo "🎉 Cleanup completed!"
fi

echo ""
echo "💡 Tips:"
echo "  - Run with --dry-run first to see what would be deleted"
echo "  - Use --web or --admin to clean up specific services only"
echo "  - This script keeps the latest $KEEP_REVISIONS revisions and $KEEP_IMAGES images by default"