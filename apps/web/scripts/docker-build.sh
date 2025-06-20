#!/bin/bash

# Docker build script for local testing
# Run from the project root: ./apps/web/scripts/docker-build.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="suzumina-web"
TAG="local"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"

echo -e "${YELLOW}🐳 Building suzumina.click Web Application Docker image...${NC}"
echo "Project root: $PROJECT_ROOT"

# Check if we're in the correct directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root or provide correct path${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Build the image
echo -e "${YELLOW}📦 Building Docker image...${NC}"
cd "$PROJECT_ROOT"

# Check if apps directory and web subdirectory exist in context
if [ ! -d "apps/web" ]; then
    echo -e "${RED}❌ Error: apps/web directory not found in build context${NC}"
    exit 1
fi

docker build \
    -f apps/web/Dockerfile \
    -t "$IMAGE_NAME:$TAG" \
    -t "$IMAGE_NAME:latest" \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully!${NC}"
    echo "Image: $IMAGE_NAME:$TAG"
    
    # Show image size
    SIZE=$(docker images "$IMAGE_NAME:$TAG" --format "table {{.Size}}" | tail -1)
    echo "Size: $SIZE"
    
    echo ""
    echo -e "${YELLOW}🚀 To run the container locally:${NC}"
    echo "docker run -p 8080:8080 $IMAGE_NAME:$TAG"
    echo ""
    echo -e "${YELLOW}🔍 To inspect the image:${NC}"
    echo "docker run -it --entrypoint /bin/sh $IMAGE_NAME:$TAG"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi