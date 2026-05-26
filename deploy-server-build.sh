#!/bin/bash

# Deployment script for CCS Yacht Frontend - Server-side build
# This version builds the Docker image on the server to avoid cross-platform issues
# Usage: ./deploy-server-build.sh

set -e

# Configuration
SERVER_IP="167.235.135.241"
SERVER_USER="root"
SSH_KEY="~/.ssh/css_key"
REMOTE_DIR="/root/ccsyacht-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting CCS Yacht Frontend Deployment (Server Build)${NC}"

# Function to execute SSH commands
ssh_exec() {
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "$1"
}

# Function to copy files via SCP
scp_copy() {
    scp -i $SSH_KEY -r $1 $SERVER_USER@$SERVER_IP:$2
}

# Step 1: Create directory on server if it doesn't exist
echo -e "${YELLOW}📁 Creating remote directory...${NC}"
ssh_exec "mkdir -p $REMOTE_DIR"

# Step 2: Copy necessary files to server
echo -e "${YELLOW}📤 Copying source files to server...${NC}"
# Create a temporary tar archive excluding node_modules and .next
tar czf - \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='*.tar.gz' \
    . | ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && tar xzf -"

# Copy production files
scp_copy "docker-compose.prod.yml" "$REMOTE_DIR/"
scp_copy ".env.production" "$REMOTE_DIR/.env"

# Step 3: Build Docker image on server
echo -e "${YELLOW}📦 Building Docker image on server...${NC}"
ssh_exec "cd $REMOTE_DIR && docker build -t ccsyacht-frontend:latest --target production ."

# Step 4: Stop existing frontend container if running
echo -e "${YELLOW}🛑 Stopping existing container (if any)...${NC}"
ssh_exec "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml down || true"

# Step 5: Start the new container
echo -e "${YELLOW}🎯 Starting new container...${NC}"
ssh_exec "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml up -d"

# Step 6: Check container status
echo -e "${YELLOW}✅ Checking container status...${NC}"
ssh_exec "docker ps | grep ccsyacht-frontend"

# Step 7: Clean up build artifacts on server
echo -e "${YELLOW}🧹 Cleaning up build artifacts...${NC}"
ssh_exec "cd $REMOTE_DIR && rm -rf node_modules .next"

echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Frontend should be accessible at http://$SERVER_IP:3000${NC}"
echo -e "${GREEN}📝 Note: Building on server avoids cross-platform compilation issues${NC}"