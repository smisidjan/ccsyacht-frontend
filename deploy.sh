#!/bin/bash

# Deployment script for CCS Yacht Frontend
# Usage: ./deploy.sh

set -e

# Configuration
SERVER_IP="167.235.135.241"
SERVER_USER="root"
SSH_KEY="~/.ssh/css_key"
REMOTE_DIR="/root/ccsyacht-frontend"
LOCAL_DIR="."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting CCS Yacht Frontend Deployment${NC}"

# Function to execute SSH commands
ssh_exec() {
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "$1"
}

# Function to copy files via SCP
scp_copy() {
    scp -i $SSH_KEY -r $1 $SERVER_USER@$SERVER_IP:$2
}

# Step 1: Build the Docker image locally for AMD64 platform
echo -e "${YELLOW}📦 Building Docker image locally for AMD64...${NC}"
docker buildx build --platform linux/amd64 -t ccsyacht-frontend:latest --target production --load .

# Step 2: Save Docker image
echo -e "${YELLOW}💾 Saving Docker image...${NC}"
docker save ccsyacht-frontend:latest | gzip > ccsyacht-frontend.tar.gz

# Step 3: Create directory on server if it doesn't exist
echo -e "${YELLOW}📁 Creating remote directory...${NC}"
ssh_exec "mkdir -p $REMOTE_DIR"

# Step 4: Copy necessary files to server
echo -e "${YELLOW}📤 Copying files to server...${NC}"
scp_copy "ccsyacht-frontend.tar.gz" "$REMOTE_DIR/"
scp_copy "docker-compose.prod.yml" "$REMOTE_DIR/"
scp_copy ".env.production" "$REMOTE_DIR/.env"

# Step 5: Load Docker image on server
echo -e "${YELLOW}📥 Loading Docker image on server...${NC}"
ssh_exec "cd $REMOTE_DIR && docker load < ccsyacht-frontend.tar.gz"

# Step 6: Stop existing frontend container if running
echo -e "${YELLOW}🛑 Stopping existing container (if any)...${NC}"
ssh_exec "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml down || true"

# Step 7: Start the new container
echo -e "${YELLOW}🎯 Starting new container...${NC}"
ssh_exec "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml up -d"

# Step 8: Check container status
echo -e "${YELLOW}✅ Checking container status...${NC}"
ssh_exec "docker ps | grep ccsyacht-frontend"

# Step 9: Clean up local tar file
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
rm -f ccsyacht-frontend.tar.gz

# Step 10: Clean up remote tar file
ssh_exec "rm -f $REMOTE_DIR/ccsyacht-frontend.tar.gz"

echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Frontend should be accessible at http://$SERVER_IP:3000${NC}"
echo -e "${GREEN}📝 Note: You'll need to configure nginx to proxy port 80 to port 3000${NC}"