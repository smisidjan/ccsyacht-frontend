#!/bin/bash

# Git-based Deployment Script for CCS Yacht Frontend
# Similar to backend deployment - uses git pull on server

set -e

# Configuration
SERVER_IP="167.235.135.241"
SERVER_USER="deploy"
REMOTE_DIR="/home/deploy/ccsyacht-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Git-based Frontend Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Step 1: Ensure all changes are committed and pushed
echo -e "${YELLOW}📝 Checking git status...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}❌ Uncommitted changes detected!${NC}"
    echo -e "${YELLOW}Please commit and push your changes first.${NC}"
    exit 1
fi

# Step 2: Push to GitHub
echo -e "${YELLOW}🔄 Pushing latest changes to GitHub...${NC}"
git push origin main

# Step 3: Connect to server and deploy
echo -e "${YELLOW}🖥️  Connecting to server...${NC}"
ssh deploy@${SERVER_IP} << 'ENDSSH'
set -e

# Colors for remote output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📍 Deploying on server...${NC}"

# Navigate to project directory
cd /home/deploy/ccsyacht-frontend

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git pull origin main

# Check if .env exists on server
echo -e "${YELLOW}📋 Checking environment variables...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}❌ No .env file found on server!${NC}"
    echo -e "${YELLOW}Please create .env file based on .env.example${NC}"
    exit 1
fi

# Install dependencies if package.json changed
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci --production=false

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

# Build Docker image
echo -e "${YELLOW}🐳 Building Docker image...${NC}"
docker build -t ccsyacht-frontend:latest --target production .

# Stop existing container
echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
docker stop ccsyacht-frontend || true
docker rm ccsyacht-frontend || true

# Start new container with proper environment
echo -e "${YELLOW}🚀 Starting new container...${NC}"
docker run -d \
  --name ccsyacht-frontend \
  --network ccsyacht-network \
  -p 127.0.0.1:3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  ccsyacht-frontend:latest

# Verify deployment
echo -e "${YELLOW}✅ Verifying deployment...${NC}"
sleep 3
if docker ps | grep -q ccsyacht-frontend; then
    echo -e "${GREEN}✅ Container is running!${NC}"
    docker logs --tail 10 ccsyacht-frontend
else
    echo -e "${RED}❌ Container failed to start!${NC}"
    docker logs ccsyacht-frontend
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Server deployment completed!${NC}"
ENDSSH

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Frontend: https://papertrail.ccsyacht.com${NC}"
echo -e "${GREEN}📡 WebSocket will connect to: 167.235.135.241:8080${NC}"