#!/bin/bash

# Docker run script for local testing
# Run from anywhere: ./apps/web/scripts/docker-run.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="suzumina-web"
TAG="local"
CONTAINER_NAME="suzumina-web-local"
PORT="8080"

echo -e "${YELLOW}🚀 Running suzumina.click Web Application locally...${NC}"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Check if image exists
if ! docker images "$IMAGE_NAME:$TAG" | grep -q "$IMAGE_NAME"; then
    echo -e "${RED}❌ Error: Image $IMAGE_NAME:$TAG not found${NC}"
    echo -e "${YELLOW}💡 Build the image first with: ./apps/web/scripts/docker-build.sh${NC}"
    exit 1
fi

# Stop and remove existing container if it exists
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

# Run the container
echo -e "${YELLOW}🐳 Starting container...${NC}"
docker run \
    --name "$CONTAINER_NAME" \
    -p "$PORT:8080" \
    -e NODE_ENV=production \
    -e NEXT_TELEMETRY_DISABLED=1 \
    -e GOOGLE_CLOUD_PROJECT=suzumina-click-firebase \
    --rm \
    "$IMAGE_NAME:$TAG" &

DOCKER_PID=$!

# Wait for the container to start
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 3

# Check if the container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ Error: Container failed to start${NC}"
    docker logs "$CONTAINER_NAME" 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Container started successfully!${NC}"
echo -e "${BLUE}📱 Application URL: http://localhost:$PORT${NC}"
echo -e "${BLUE}🏥 Health check: http://localhost:$PORT/api/health${NC}"
echo ""
echo -e "${YELLOW}📊 Container logs:${NC}"
echo -e "${YELLOW}docker logs -f $CONTAINER_NAME${NC}"
echo ""
echo -e "${YELLOW}🛑 To stop the container:${NC}"
echo -e "${YELLOW}docker stop $CONTAINER_NAME${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop and remove the container${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    echo -e "${GREEN}✅ Container stopped${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Wait for the Docker process
wait $DOCKER_PID